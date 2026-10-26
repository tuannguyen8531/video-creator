// One-time local migration: move sources and preserve/rebase existing render artifacts.
import {createHash} from 'node:crypto';
import {access, mkdir, readFile, readdir, rename, rmdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {CodemodsInternals, setCompositionDefaultProps} from '@remotion/codemods';
import {copyPublicAssets, projectPaths, publishOutput} from '../src/paths';

const root = process.cwd();
const exists = async (file: string) => {try {await access(file); return true;} catch {return false;}};
const mappings = [
  ['examples/intro', 'projects/intro/input'],
  ['examples/character', 'projects/character-waving/input'],
  ['examples/flexible', 'projects/flexible/input'],
];
await mkdir('projects', {recursive: true});
for (const entry of await readdir('projects', {withFileTypes: true})) {
  if (entry.isDirectory() && await exists(`projects/${entry.name}/project.json`)) mappings.push([`projects/${entry.name}`, `projects/${entry.name}/input`]);
}
const mapPath = (value: string) => {
  for (const [, next] of mappings) {
    const b = path.resolve(next);
    if (value === b || value.startsWith(b + path.sep)) return value;
  }
  for (const [old, next] of mappings) {
    const a = path.resolve(old), b = path.resolve(next);
    if (value === b || value.startsWith(b + path.sep)) return value;
    if (value === a || value.startsWith(a + path.sep)) return b + value.slice(a.length);
  }
  return value;
};
function rebaseImports(source: string, oldFile: string, nextFile: string) {
  return source.replace(/(^import\s+.*?\sfrom\s*)(['"])(.*?)\2/gm, (match, prefix, _quote, specifier: string) => {
    if (!specifier.startsWith('.')) return match;
    const target = mapPath(path.resolve(path.dirname(oldFile), specifier));
    const relative = path.relative(path.dirname(nextFile), target).split(path.sep).join('/');
    return prefix + JSON.stringify(relative.startsWith('.') ? relative : `./${relative}`);
  });
}
function rebaseProps(props: any) {
  const video = props?.video;
  if (!video?.project) return;
  const fixScene = (scene: any) => {
    for (const key of ['component', 'image']) if (typeof scene[key] === 'string' && path.isAbsolute(scene[key])) scene[key] = mapPath(scene[key]);
    for (const seg of scene.narration ?? []) if (typeof seg.audio === 'string' && path.isAbsolute(seg.audio)) seg.audio = mapPath(seg.audio);
  };
  for (const scene of video.project.scenes) fixScene(scene);
  for (const item of video.scenes) fixScene(item.scene);
  if (video.project.font && path.isAbsolute(video.project.font)) video.project.font = mapPath(video.project.font);
}
const priorManifest = '.cache/legacy-artifacts/migration.json';
if (await exists(priorManifest)) {
  const previous = JSON.parse(await readFile(priorManifest, 'utf8'));
  for (const run of previous.runs) mappings.push([path.relative(root, run.from), path.relative(root, run.work)]);
  let repaired = 0;
  for (const run of previous.runs) for (const file of await readdir(run.work)) if (file.endsWith('.tsx')) {
    const target = path.join(run.work, file);
    const source = await readFile(target, 'utf8');
    const next = rebaseImports(source, target, target);
    if (next !== source) {await writeFile(target, next); repaired++;}
  }
  if (repaired) await writeFile(priorManifest, JSON.stringify({...previous, importRepairs: repaired}, null, 2));
  console.log(`Migration already completed; ${repaired} legacy snapshot import(s) repaired, existing data and manifest preserved.`);
  process.exit(0);
}
const manifest = {sources: [] as {from: string; to: string}[], runs: [] as object[], archived: [] as string[]};
for (const [old, next] of mappings) {
  if (!await exists(old)) continue;
  const entries = (await readdir(old, {withFileTypes: true})).filter((e) => !['input', 'output', '.work'].includes(e.name));
  await mkdir(next, {recursive: true});
  for (const entry of entries) {
    const from = path.resolve(old, entry.name), to = path.resolve(next, entry.name);
    if (await exists(to)) throw new Error(`Refusing to overwrite input: ${to}`);
    await rename(from, to);
    if (entry.isFile() && /\.[jt]sx?$/.test(entry.name)) await writeFile(to, rebaseImports(await readFile(to, 'utf8'), from, to));
    manifest.sources.push({from, to});
  }
  if (old.startsWith('examples/')) await rmdir(old);
}
const legacy = path.resolve('.cache/legacy-artifacts');
await mkdir(legacy, {recursive: true});
if (await exists('out')) for (const entry of await readdir('out', {withFileTypes: true})) {
  const oldDir = path.resolve('out', entry.name);
  if (!entry.isDirectory() || !await exists(path.join(oldDir, 'report.json'))) {
    const target = path.join(legacy, entry.name);
    if (await exists(target)) throw new Error(`Archive already exists: ${target}`);
    await rename(oldDir, target); manifest.archived.push(target); continue;
  }
  const report = JSON.parse(await readFile(path.join(oldDir, 'report.json'), 'utf8'));
  const projectFile = mapPath(report.project);
  if (!await exists(projectFile)) throw new Error(`Cannot associate legacy run with input: ${report.project}`);
  const paths = projectPaths(projectFile, entry.name);
  mappings.push([path.relative(root, oldDir), path.relative(root, paths.workDir)]);
  if (await exists(paths.workDir)) throw new Error(`Refusing to overwrite work: ${paths.workDir}`);
  await mkdir(path.dirname(paths.workDir), {recursive: true});
  await rename(oldDir, paths.workDir);
  await mkdir(path.join(paths.workDir, 'previews'), {recursive: true});
  await copyPublicAssets(paths.inputDir, paths.publicDir);
  const generated = path.resolve('public/generated', entry.name);
  if (await exists(generated)) {
    await mkdir(path.join(paths.publicDir, 'generated'), {recursive: true});
    await rename(generated, path.join(paths.publicDir, 'generated', entry.name));
  }
  for (const file of await readdir(paths.workDir)) {
    const target = path.join(paths.workDir, file);
    if (file.endsWith('.png')) await rename(target, path.join(paths.workDir, 'previews', file));
    if (file === 'prepared.json') {
      const props = JSON.parse(await readFile(target, 'utf8')); rebaseProps(props);
      await writeFile(target, JSON.stringify(props, null, 2));
    }
    if (file.endsWith('.tsx')) {
      let source = rebaseImports(await readFile(target, 'utf8'), path.join(oldDir, file), target);
      const extraction = CodemodsInternals.computeCanUpdateDefaultPropsFromContent(source, 'Presentation');
      if (extraction.canUpdate) {
        const props = extraction.currentDefaultProps;
        rebaseProps(props);
        const update = setCompositionDefaultProps({project: {files: {[target]: source}, rootDir: root}, compositionFile: target, compositionId: 'Presentation', defaultProps: props as any});
        source = update.changes[0]?.nextContents ?? source;
      }
      await writeFile(target, source);
    }
  }
  Object.assign(report, {project: projectFile, workDir: paths.workDir, outputDir: paths.outputDir, migratedFrom: oldDir});
  const complete = report.status === 'rendered' && await exists(path.join(paths.workDir, 'video.mp4'));
  let checksum: string | undefined;
  if (complete) {
    checksum = createHash('sha256').update(await readFile(path.join(paths.workDir, 'video.mp4'))).digest('hex');
    Object.assign(report, {video: path.join(paths.outputDir, 'video.mp4'), captions: path.join(paths.outputDir, 'captions.srt')});
  }
  await writeFile(path.join(paths.workDir, 'report.json'), JSON.stringify(report, null, 2));
  if (complete) {
    await publishOutput(paths.workDir, paths.outputDir, entry.name);
    const after = createHash('sha256').update(await readFile(path.join(paths.outputDir, 'video.mp4'))).digest('hex');
    if (after !== checksum) throw new Error(`Video checksum changed: ${entry.name}`);
  }
  manifest.runs.push({from: oldDir, work: paths.workDir, output: complete ? paths.outputDir : null, sha256: checksum});
}
if (await exists('out')) await rmdir('out');
if (await exists('examples')) await rmdir('examples');
if (await exists('public/generated')) {
  if ((await readdir('public/generated')).length) await rename('public/generated', path.join(legacy, 'generated-unassociated'));
  else await rmdir('public/generated');
}
// Select the newest historical successful run per project after migrating all runs.
for (const project of await readdir('projects', {withFileTypes: true})) {
  if (!project.isDirectory()) continue;
  const output = path.resolve('projects', project.name, 'output');
  if (!await exists(output)) continue;
  const reports = [];
  for (const run of await readdir(output, {withFileTypes: true})) if (run.isDirectory()) {
    const report = JSON.parse(await readFile(path.join(output, run.name, 'report.json'), 'utf8'));
    if (report.status === 'rendered') reports.push(report);
  }
  reports.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const latest = reports.at(-1);
  if (latest) await writeFile(path.join(output, 'latest.json'), JSON.stringify({runId: latest.runId, video: `${latest.runId}/video.mp4`, captions: `${latest.runId}/captions.srt`, report: `${latest.runId}/report.json`, previews: `${latest.runId}/previews`, createdAt: latest.startedAt}, null, 2));
}
await writeFile(path.join(legacy, 'migration.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({sources: manifest.sources.length, runs: manifest.runs.length, archived: manifest.archived.length, manifest: path.join(legacy, 'migration.json')}, null, 2));
