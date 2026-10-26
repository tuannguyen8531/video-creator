import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash, randomUUID} from 'node:crypto';
import {copyFile, mkdir, readFile, rename, rm, writeFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {buildTimeline, projectSchema, toSrt, type Project, type Segment} from './project';
import {REQUEST_VERSION, resolveVoice, speechSettings, synthesize} from './tts/capcut';
import {analyzeMouth} from './lipsync';
import {validatePickupReach} from './animation/motion';
import {copyPublicAssets, projectPaths} from './paths';

const exec = promisify(execFile);
export const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export function cacheKey(segment: Segment, project: Project) {
  const settings = speechSettings(segment, project);
  const voice = resolveVoice(settings.voice);
  return hash(JSON.stringify({version: REQUEST_VERSION, text: segment.text.trim(), voice: voice.voice_type,
    resource: voice.resource_id, language: settings.language, speed: settings.speed.toFixed(2)}));
}
export async function probeAudio(file: string): Promise<number> {
  const {stdout} = await exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file], {timeout: 15_000});
  const data = JSON.parse(stdout);
  const duration = Number(data.format?.duration);
  if (!data.streams?.some((s: {codec_type: string}) => s.codec_type === 'audio') || !Number.isFinite(duration) || duration <= 0 || duration > 600) throw new Error(`Invalid audio duration/stream: ${file}`);
  return duration;
}
export async function validateProject(file: string) {
  // Bound project input before JSON/Zod validation; assets are separate files.
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of createReadStream(file)) {
    const buffer = chunk as Buffer;
    bytes += buffer.length;
    if (bytes > 1024 * 1024) throw new Error('Project JSON exceeds 1 MiB; keep media in separate asset files');
    chunks.push(buffer);
  }
  const project = projectSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  if (project.font) {
    if (!/\.(ttf|otf|woff2?)$/i.test(project.font)) throw new Error('font must be a local TTF, OTF, WOFF or WOFF2 file');
    await readFile(path.resolve(path.dirname(file), project.font));
  }
  for (const scene of project.scenes) {
    if (scene.layout === 'image-and-text') await readFile(path.resolve(path.dirname(file), scene.image));
    if (scene.layout === 'custom') {
      if (!/\.(tsx|jsx)$/i.test(scene.component)) throw new Error(`${scene.id}: custom component must be a local TSX/JSX module with a default export`);
      await readFile(path.resolve(path.dirname(file), scene.component));
    }
    for (const seg of scene.narration) {
      try {
        if (seg.audio) await probeAudio(path.resolve(path.dirname(file), seg.audio));
        else speechSettings(seg, project);
      } catch (error) {throw new Error(`${scene.id}/${seg.id}: ${(error as Error).message}`);}
    }
  }
  return project;
}

export async function prepareProject(file: string, options: {signal?: AbortSignal; voiceOnly?: boolean} = {}) {
  const project = await validateProject(file);
  const runId = `${project.id}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const {projectDir, inputDir, workDir, publicDir, outputDir} = projectPaths(file, runId);
  const generatedDir = path.join(publicDir, 'generated');
  const cacheDir = path.resolve('.cache/tts');
  await Promise.all([mkdir(workDir, {recursive: true}), mkdir(generatedDir, {recursive: true}), mkdir(cacheDir, {recursive: true})]);
  const report = {runId, project: path.resolve(file), workDir, outputDir, status: 'preparing', cacheHits: 0, generated: 0, localAudio: 0, ttsHttpRequests: 0, lipSyncGenerated: 0, lipSyncCacheHits: 0,
    startedAt: new Date().toISOString(), elapsedMs: 0, segments: [] as {sceneId: string; segmentId: string; status: string; language?: string; voice?: string; duration?: number; error?: string}[]};
  const start = Date.now();
  const audio: Parameters<typeof buildTimeline>[1] = [];
  try {
    await copyPublicAssets(inputDir, publicDir);
    if (project.font) {
      const source = path.resolve(path.dirname(file), project.font);
      const name = hash(await readFile(source)) + path.extname(source).toLowerCase();
      await copyFile(source, path.join(generatedDir, name));
      project.font = `generated/${name}`;
    }
    // ponytail: sequential TTS keeps request volume bounded; add a small worker pool only after measuring throughput.
    for (const scene of project.scenes) {
      if (scene.layout === 'image-and-text') {
        const source = path.resolve(path.dirname(file), scene.image);
        const name = hash(await readFile(source)) + path.extname(source).toLowerCase();
        await copyFile(source, path.join(generatedDir, name));
        scene.image = `generated/${name}`;
      }
      if (scene.layout === 'custom') scene.component = path.resolve(path.dirname(file), scene.component);
      for (const segment of scene.narration) {
        const settings = segment.audio ? {voice: segment.voice ?? project.voice, language: segment.language ?? project.language, speed: segment.speed ?? project.speed} : speechSettings(segment, project);
        const result = {sceneId: scene.id, segmentId: segment.id, status: 'pending', language: settings.language, voice: settings.voice, duration: undefined as number | undefined, error: undefined as string | undefined};
        report.segments.push(result);
        try {
          options.signal?.throwIfAborted();
          let source: string;
          let duration: number;
          if (segment.audio) {
            source = path.resolve(path.dirname(file), segment.audio);
            duration = await probeAudio(source);
            report.localAudio++;
            result.status = 'local';
          } else {
            const key = cacheKey(segment, project);
            source = path.join(cacheDir, `${key}.mp3`);
            try {
              duration = await probeAudio(source);
              report.cacheHits++;
              result.status = 'cached';
            } catch {
              const bytes = await synthesize(segment.text, settings.voice!, settings.speed, {
                language: settings.language,
                signal: options.signal,
                fetch: async (...args) => {report.ttsHttpRequests++; return fetch(...args);},
              });
              const tmp = `${source}.${randomUUID()}.part.mp3`;
              try {
                await writeFile(tmp, bytes);
                duration = await probeAudio(tmp);
                await exec('ffmpeg', ['-v', 'error', '-i', tmp, '-f', 'null', '-'], {timeout: 30_000});
                await rename(tmp, source);
                await writeFile(path.join(cacheDir, `${key}.json`), JSON.stringify({key, voice: settings.voice, language: settings.language, duration, createdAt: new Date().toISOString()}, null, 2));
              } finally {await rm(tmp, {force: true});}
              report.generated++;
              result.status = 'generated';
            }
          }
          const name = hash(await readFile(source)) + path.extname(source).toLowerCase();
          await copyFile(source, path.join(generatedDir, name));
          result.duration = duration;
          const mouth = scene.layout === 'character' || (scene.layout === 'custom' && scene.lipSync) ? await analyzeMouth(source, duration, options.signal) : undefined;
          if (mouth) {if (mouth.cached) report.lipSyncCacheHits++; else report.lipSyncGenerated++;}
          audio.push({sceneId: scene.id, segmentId: segment.id, src: `generated/${name}`, duration, language: settings.language, voice: settings.voice, mouthCues: mouth?.cues});
          console.log(`[voice] ${scene.id}/${segment.id}: ${result.status}, ${duration.toFixed(2)}s`);
        } catch (error) {
          result.status = 'failed'; result.error = (error as Error).message;
          throw new Error(`${scene.id}/${segment.id}: ${result.error}`);
        }
      }
    }
    const video = buildTimeline(project, audio);
    for (const scene of project.scenes) if (scene.layout === 'character') validatePickupReach(scene, video.cues, project.fps);
    await writeFile(path.join(workDir, 'prepared.json'), JSON.stringify({video}, null, 2));
    await writeFile(path.join(workDir, 'captions.srt'), toSrt(video));
    report.status = options.voiceOnly ? 'voiced' : 'prepared';
    return {video, projectDir, inputDir, workDir, publicDir, outputDir, propsFile: path.join(workDir, 'prepared.json'), report};
  } catch (error) {
    report.status = 'failed';
    throw error;
  } finally {
    report.elapsedMs = Date.now() - start;
    await writeFile(path.join(workDir, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`[report] ${path.join(workDir, 'report.json')}`);
  }
}
