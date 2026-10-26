import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir, chmod, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {RHUBARB_VERSION, defaultRhubarb} from '../src/lipsync';

if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('Automatic setup supports Linux x64. Install Rhubarb for your OS from its official releases and set RHUBARB_BIN.');
const exec = promisify(execFile);
const dir = path.resolve('.cache/tools');
await mkdir(dir, {recursive: true});
const name = `Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux.zip`;
const metadata = await fetch(`https://api.github.com/repos/DanielSWolf/rhubarb-lip-sync/releases/tags/v${RHUBARB_VERSION}`, {signal: AbortSignal.timeout(15_000)});
if (!metadata.ok) throw new Error(`Rhubarb release metadata HTTP ${metadata.status}`);
const release = await metadata.json() as {assets: {name: string; browser_download_url: string; digest?: string}[]};
const asset = release.assets.find((a) => a.name === name);
if (!asset) throw new Error('Official Rhubarb Linux archive was not found');
console.log(`Downloading official Rhubarb ${RHUBARB_VERSION} (about 87 MB)…`);
const response = await fetch(asset.browser_download_url, {signal: AbortSignal.timeout(120_000)});
if (!response.ok) throw new Error(`Rhubarb download HTTP ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
if (asset.digest?.startsWith('sha256:') && `sha256:${createHash('sha256').update(bytes).digest('hex')}` !== asset.digest) throw new Error('Rhubarb archive checksum mismatch');
const archive = path.join(dir, name);
try {
  await writeFile(archive, bytes);
  await exec('unzip', ['-q', '-o', archive, '-d', dir], {timeout: 30_000});
  await chmod(defaultRhubarb, 0o755);
  console.log((await exec(defaultRhubarb, ['--version'], {timeout: 5000})).stdout.trim());
  console.log(`Installed: ${defaultRhubarb}`);
} finally {await rm(archive, {force: true});}
