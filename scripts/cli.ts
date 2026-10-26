import {parseArgs} from 'node:util';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {mkdir, writeFile, rm} from 'node:fs/promises';
import {bundle} from '@remotion/bundler';
import {makeCancelSignal, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {prepareProject, validateProject} from '../src/prepare';
import {voices} from '../src/tts/capcut';
import {createStudioEntry} from '../src/studio';
import {publishOutput, resolveProjectFile} from '../src/paths';

const controller = new AbortController();
process.once('SIGINT', () => controller.abort(new Error('Cancelled by SIGINT')));
process.once('SIGTERM', () => controller.abort(new Error('Cancelled by SIGTERM')));
async function main() {
  // npm also invokes "prepare" during install/ci; installing must never call TTS.
  if (process.env.npm_lifecycle_event === 'prepare' && ['install', 'ci', 'rebuild', 'update'].includes(process.env.npm_command ?? '')) {
    console.log('Install complete; run npm run prepare explicitly to prepare a video.');
    return;
  }
  const {positionals, values} = parseArgs({allowPositionals: true, options: {
    project: {type: 'string'}, concurrency: {type: 'string', default: '2'}, language: {type: 'string'}, json: {type: 'boolean', default: false},
  }});
  const command = positionals[0];
  if (command === 'voices') {
    const language = values.language ? new Intl.Locale(values.language).language : undefined;
    const catalog = voices.filter((v) => !language || new Intl.Locale(v.lang ?? v.lan).language === language)
      .map((v) => ({id: `capcut:${v.voice_type}`, name: v.display_name, language: v.lang ?? v.lan}));
    if (values.json) console.log(JSON.stringify(catalog, null, 2)); else console.table(catalog);
    return;
  }
  if (!['check', 'voice', 'prepare', 'render', 'dev'].includes(command)) throw new Error('Expected check, voices, voice, prepare, dev or render');
  const file = await resolveProjectFile(values.project);
  if (command === 'check') {const project = await validateProject(file); console.log(`Valid: ${project.id}, ${project.scenes.length} scenes`); return;}
  const concurrency = Number(values.concurrency);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error('--concurrency must be an integer from 1 to 8');
  const prepared = await prepareProject(file, {signal: controller.signal, voiceOnly: command === 'voice'});
  if (command === 'voice' || command === 'prepare') {console.log(`[props] ${prepared.propsFile}`); return;}
  const entryPoint = await createStudioEntry(prepared.video, prepared.workDir);
  if (command === 'dev') {
    console.log(`[studio] ${entryPoint}`);
    const bin = path.resolve('node_modules/@remotion/cli/remotion-cli.js');
    const child = spawn(process.execPath, [bin, 'studio', entryPoint, `--public-dir=${prepared.publicDir}`, '--host=127.0.0.1'], {stdio: 'inherit'});
    controller.signal.addEventListener('abort', () => child.kill('SIGTERM'), {once: true});
    const code = await new Promise<number>((resolve, reject) => {child.on('error', reject); child.on('exit', (code) => resolve(code ?? 1));});
    process.exitCode = code; return;
  }
  const started = Date.now();
  const {cancelSignal, cancel} = makeCancelSignal();
  controller.signal.addEventListener('abort', cancel, {once: true});
  let serveUrl: string | undefined;
  try {
    controller.signal.throwIfAborted();
    serveUrl = await bundle({entryPoint, publicDir: prepared.publicDir});
    controller.signal.throwIfAborted();
    const inputProps = {video: prepared.video};
    const composition = await selectComposition({serveUrl, id: 'Presentation', inputProps});
    const outputLocation = path.join(prepared.workDir, 'video.mp4');
    let last = -1;
    await renderMedia({serveUrl, composition, inputProps, codec: 'h264', audioCodec: 'aac', pixelFormat: 'yuv420p',
      outputLocation, concurrency, cancelSignal, onProgress: ({progress}) => {
        const bucket = Math.floor(progress * 10);
        if (bucket !== last) {last = bucket; console.log(`[render] ${Math.round(progress * 100)}%`);}
      }});
    const previews = path.join(prepared.workDir, 'previews');
    await mkdir(previews, {recursive: true});
    for (const item of prepared.video.scenes) {
      await renderStill({serveUrl, composition, inputProps, frame: Math.min(item.from + 55, item.from + item.durationInFrames - 1), output: path.join(previews, `scene-${item.scene.id}.png`)});
    }
    Object.assign(prepared.report, {status: 'rendered', renderMs: Date.now() - started, video: path.join(prepared.outputDir, 'video.mp4'),
      captions: path.join(prepared.outputDir, 'captions.srt'), durationSeconds: composition.durationInFrames / composition.fps});
    await writeFile(path.join(prepared.workDir, 'report.json'), JSON.stringify(prepared.report, null, 2));
    await publishOutput(prepared.workDir, prepared.outputDir, prepared.report.runId);
    console.log(`[video] ${path.join(prepared.outputDir, 'video.mp4')}`);
    console.log(`[latest] ${path.join(prepared.projectDir, 'output/latest.json')}`);
  } catch (error) {
    Object.assign(prepared.report, {status: 'render-failed', error: (error as Error).message});
    throw error;
  } finally {
    await writeFile(path.join(prepared.workDir, 'report.json'), JSON.stringify(prepared.report, null, 2));
    if (serveUrl) await rm(serveUrl, {recursive: true, force: true});
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
