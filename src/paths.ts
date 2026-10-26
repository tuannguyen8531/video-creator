import {access, copyFile, cp, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';

export async function resolveProjectFile(selection?: string): Promise<string> {
  let candidate = path.resolve(selection ?? 'project.json');
  if (selection) {
    try {
      if ((await stat(candidate)).isDirectory()) {
        const nested = path.join(candidate, 'input/project.json');
        try {await access(nested); return nested;} catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          return path.join(candidate, 'project.json');
        }
      }
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      if (/^[a-zA-Z0-9_-]+$/.test(selection)) candidate = path.resolve('projects', selection, 'input/project.json');
    }
  }
  try {await access(candidate);} catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    throw new Error(`Project not found: ${candidate}. Choose --project <name>, a project folder, or input/project.json. Examples are not selected automatically.`);
  }
  return candidate;
}

export function projectPaths(file: string, runId: string) {
  let inputDir = path.dirname(path.resolve(file));
  let cursor = inputDir;
  while (path.dirname(cursor) !== cursor) {
    if (path.basename(cursor) === 'input') {inputDir = cursor; break;}
    cursor = path.dirname(cursor);
  }
  const projectDir = path.basename(inputDir) === 'input' ? path.dirname(inputDir) : inputDir;
  const workDir = path.join(projectDir, '.work', runId);
  return {projectDir, inputDir, workDir, publicDir: path.join(workDir, 'public'), outputDir: path.join(projectDir, 'output', runId)};
}

export async function copyPublicAssets(inputDir: string, publicDir: string) {
  await cp(new URL('../public/', import.meta.url), publicDir, {recursive: true,
    filter: (source) => path.basename(source) !== 'generated'});
  const assets = path.join(inputDir, 'assets');
  try {await access(assets);} catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  await cp(assets, path.join(publicDir, 'assets'), {recursive: true});
}

// Publish a complete run without overwriting a previous video or exposing partial output.
export async function publishOutput(workDir: string, outputDir: string, runId: string) {
  const root = path.dirname(outputDir);
  await mkdir(root, {recursive: true});
  try {await access(outputDir); throw new Error(`Output already exists: ${outputDir}`);} catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const staging = await mkdtemp(path.join(root, '.publish-'));
  try {
    for (const name of ['video.mp4', 'captions.srt', 'report.json']) await copyFile(path.join(workDir, name), path.join(staging, name));
    await cp(path.join(workDir, 'previews'), path.join(staging, 'previews'), {recursive: true});
    await rename(staging, outputDir);
    const report = JSON.parse(await readFile(path.join(outputDir, 'report.json'), 'utf8'));
    const latest = {runId, video: `${runId}/video.mp4`, captions: `${runId}/captions.srt`, report: `${runId}/report.json`, previews: `${runId}/previews`, createdAt: report.startedAt};
    const part = path.join(root, `.latest-${runId}.json`);
    try {await writeFile(part, JSON.stringify(latest, null, 2)); await rename(part, path.join(root, 'latest.json'));}
    finally {await rm(part, {force: true});}
    await rm(path.join(workDir, 'video.mp4'), {force: true});
    await rm(path.join(workDir, 'previews'), {recursive: true, force: true});
  } finally {await rm(staging, {recursive: true, force: true});}
}
