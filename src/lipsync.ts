import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash, randomUUID} from 'node:crypto';
import {mkdir, mkdtemp, readFile, rename, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import type {MouthCue} from './project';

const exec = promisify(execFile);
export const RHUBARB_VERSION = '1.14.0';
export const defaultRhubarb = path.resolve(`.cache/tools/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux/rhubarb`);

export function parseMouthCues(raw: unknown, duration: number): MouthCue[] {
  if (!Array.isArray(raw) || !raw.length) throw new Error('Lip sync returned no mouth cues');
  let end = 0;
  return raw.map((c) => {
    if (!c || typeof c.start !== 'number' || typeof c.end !== 'number' || !Number.isFinite(c.start) || !Number.isFinite(c.end) ||
      c.start < end - 0.001 || c.start < 0 || c.end <= c.start || c.end > duration + 0.1 || !/^[A-HX]$/.test(c.value)) throw new Error('Invalid or overlapping lip-sync cues');
    end = c.end;
    return {start: c.start, end: Math.min(c.end, duration), value: c.value};
  });
}

export async function analyzeMouth(audio: string, duration: number, signal?: AbortSignal) {
  const bin = process.env.RHUBARB_BIN || defaultRhubarb;
  let version: string;
  try {version = (await exec(bin, ['--version'], {timeout: 5000, signal})).stdout.trim();}
  catch {signal?.throwIfAborted(); throw new Error('Lip-sync tool unavailable. Run npm run setup:lipsync, or set RHUBARB_BIN to your Rhubarb executable.');}
  const key = createHash('sha256').update(await readFile(audio)).update(`|${version}|phonetic|16k-mono|v1`).digest('hex');
  const dir = path.resolve('.cache/lipsync');
  await mkdir(dir, {recursive: true});
  const cache = path.join(dir, `${key}.json`);
  try {return {cues: parseMouthCues(JSON.parse(await readFile(cache, 'utf8')), duration), cached: true};} catch { /* Missing or invalid cache is regenerated. */ }
  const job = await mkdtemp(path.join(dir, 'job-'));
  try {
    const wav = path.join(job, 'voice.wav');
    await exec('ffmpeg', ['-v', 'error', '-i', audio, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav], {timeout: 30_000, signal});
    const {stdout} = await exec(bin, ['-r', 'phonetic', '-f', 'json', '--extendedShapes', 'GHX', '--quiet', wav], {timeout: 120_000, maxBuffer: 4 * 1024 * 1024, signal});
    const cues = parseMouthCues(JSON.parse(stdout).mouthCues, duration);
    const part = `${cache}.${randomUUID()}.part`;
    try {await writeFile(part, JSON.stringify(cues)); await rename(part, cache);} finally {await rm(part, {force: true});}
    return {cues, cached: false};
  } finally {await rm(job, {recursive: true, force: true});}
}
