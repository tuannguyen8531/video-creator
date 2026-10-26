import test from 'node:test';
import assert from 'node:assert/strict';
import {access, readFile, mkdtemp, mkdir, writeFile, rm, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {projectSchema, buildTimeline, toSrt, wrapCaption, captionCues} from '../src/project';
import {cacheKey, prepareProject, validateProject} from '../src/prepare';
import {escapeXml, headerSign, makeSsml, resolveVoice, speechSettings, synthesize} from '../src/tts/capcut';
import {createStudioEntry} from '../src/studio';
import {CodemodsInternals, setCompositionDefaultProps} from '@remotion/codemods';
import {actionWindows, jointBetween, mouthAt, stageState, validatePickupReach} from '../src/animation/motion';
import {parseMouthCues} from '../src/lipsync';
import {projectPaths, publishOutput, resolveProjectFile} from '../src/paths';

const example = JSON.parse(await readFile('projects/intro/input/project.json', 'utf8'));
const project = projectSchema.parse(example);
const storyInput = JSON.parse(await readFile('projects/character-waving/input/project.json', 'utf8'));
const story = projectSchema.parse(storyInput);
test('project selectors resolve names, folders and input variants to the same project workspace', async () => {
  const expected = path.resolve('projects/intro/input/project.json');
  assert.equal(await resolveProjectFile('intro'), expected);
  assert.equal(await resolveProjectFile('projects/intro'), expected);
  assert.equal(await resolveProjectFile('projects/intro/input'), expected);
  assert.equal(await resolveProjectFile(expected), expected);
  const standard = projectPaths(expected, 'same-run');
  const variant = projectPaths(path.resolve('projects/intro/input/configs/variant.json'), 'same-run');
  assert.equal(variant.projectDir, standard.projectDir);
  assert.equal(standard.outputDir, path.resolve('projects/intro/output/same-run'));
  assert.equal(standard.publicDir, path.resolve('projects/intro/.work/same-run/public'));
  assert.notEqual(standard.workDir, projectPaths(path.resolve('projects/flexible/input/project.json'), 'same-run').workDir);
});
test('only complete outputs are published; failure preserves latest and previous videos', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'video-creator-publish-'));
  try {
    const file = path.join(dir, 'input/project.json');
    const first = projectPaths(file, 'first');
    await mkdir(path.join(first.workDir, 'previews'), {recursive: true});
    await writeFile(path.join(first.workDir, 'video.mp4'), 'first-video');
    await writeFile(path.join(first.workDir, 'captions.srt'), 'captions');
    await writeFile(path.join(first.workDir, 'report.json'), JSON.stringify({status: 'rendered', startedAt: '2026-10-26'}));
    await writeFile(path.join(first.workDir, 'prepared.json'), 'internal-only');
    await writeFile(path.join(first.workDir, 'previews/scene.png'), 'preview');
    await publishOutput(first.workDir, first.outputDir, 'first');
    assert.equal(await readFile(path.join(first.outputDir, 'video.mp4'), 'utf8'), 'first-video');
    assert.equal(await readFile(path.join(first.outputDir, 'previews/scene.png'), 'utf8'), 'preview');
    await assert.rejects(access(path.join(first.outputDir, 'prepared.json')));
    await assert.rejects(access(path.join(first.workDir, 'video.mp4')));
    const next = projectPaths(file, 'broken');
    await mkdir(next.workDir, {recursive: true});
    await writeFile(path.join(next.workDir, 'video.mp4'), 'partial-video');
    await assert.rejects(publishOutput(next.workDir, next.outputDir, 'broken'));
    await assert.rejects(access(next.outputDir));
    const latest = JSON.parse(await readFile(path.join(first.projectDir, 'output/latest.json'), 'utf8'));
    assert.equal(latest.video, 'first/video.mp4');
    assert.deepEqual((await readdir(path.join(first.projectDir, 'output'))).sort(), ['first', 'latest.json']);
    await assert.rejects(publishOutput(first.workDir, first.outputDir, 'first'), /already exists/);
    assert.equal(await readFile(path.join(first.outputDir, 'video.mp4'), 'utf8'), 'first-video');
  } finally {await rm(dir, {recursive: true, force: true});}
});
test('silent scenes need only explicit duration, with no voice or language requirement', () => {
  const silent = projectSchema.parse({id: 'silent', title: 'Silent', scenes: [{id: 'open', layout: 'title', title: 'Hello', duration: 2}]});
  assert.equal(silent.voice, undefined); assert.equal(silent.language, undefined);
  const video = buildTimeline(silent, []);
  assert.equal(video.durationInFrames, 60); assert.equal(video.cues.length, 0);
  assert.equal(toSrt(video), '');
  assert.throws(() => projectSchema.parse({id: 'bad', title: 'Bad', scenes: [{id: 'open', layout: 'title', title: 'Hello'}]}));
  const narrated = projectSchema.parse({...example, scenes: [{...example.scenes[0], duration: 10}]});
  const held = buildTimeline(narrated, narrated.scenes[0].narration.map((s) => ({sceneId: 'opening', segmentId: s.id, src: 'audio.mp3', duration: 1})));
  assert.equal(held.cues[0].startFrame, 15); assert.equal(held.durationInFrames, 300);
});
test('no default project or voice is chosen; language and voice can vary by segment', async () => {
  assert.throws(() => projectSchema.parse({...example, voice: undefined}));
  const segment = project.scenes[0].narration[0];
  const english = {...segment, voice: 'capcut:en_us_006', language: 'en-US'};
  assert.equal(speechSettings(english, project).language, 'en-US');
  assert.equal(speechSettings(segment, project).language, 'vi-VN');
  assert.throws(() => speechSettings({...segment, language: 'en-US'}, project), /matching voice/);
  assert.notEqual(cacheKey(segment, project), cacheKey({...segment, language: 'vi'}, project));
  assert.match(makeSsml('Hello', resolveVoice(english.voice), 1, 'en-US'), /xml:lang="en-US"/);
  assert.match(makeSsml('Xin chào', resolveVoice(project.voice!), 1, 'vi-VN'), /xml:lang="vi-VN"/);
  const dir = await mkdtemp(path.join(tmpdir(), 'video-creator-no-default-'));
  try {
    assert.throws(() => execFileSync(process.execPath, ['--import', import.meta.resolve('tsx'), path.resolve('scripts/cli.ts'), 'check'], {cwd: dir, stdio: 'pipe'}), (error: any) => /Examples are not selected automatically/.test(error.stderr.toString()));
  } finally {await rm(dir, {recursive: true, force: true});}
});
test('mixed built-in/custom scenes preserve authored props and generate imports without changing core schema', async () => {
  const input = JSON.parse(await readFile('projects/flexible/input/project.json', 'utf8'));
  const mixed = await validateProject(path.resolve('projects/flexible/input/project.json'));
  assert.deepEqual(mixed.scenes.map((s) => s.layout), ['title', 'custom', 'character']);
  const dir = await mkdtemp(path.join(tmpdir(), 'video-creator-custom-'));
  try {
    const custom = mixed.scenes[1]; if (custom.layout !== 'custom') throw new Error('Expected custom');
    custom.component = path.resolve('projects/flexible/input/Orbit.tsx');
    const video = buildTimeline(mixed, mixed.scenes.flatMap((s) => s.narration.map((seg) => ({sceneId: s.id, segmentId: seg.id, src: 'audio.mp3', duration: 1}))));
    await createStudioEntry(video, dir);
    const root = await readFile(path.join(dir, 'StudioRoot.tsx'), 'utf8');
    assert.match(root, /import Custom0 from/); assert.match(root, /"imagine": Custom0/);
    assert.equal(CodemodsInternals.computeCanUpdateDefaultPropsFromContent(root, 'Presentation').canUpdate, true);
    assert.equal(custom.props.heading, 'Ý tưởng không có một khuôn duy nhất');
    input.scenes[1].component = './missing.tsx';
    // The regular validator checks module files before any cloud calls.
    const missingInput = path.join(dir, 'missing.json');
    await writeFile(missingInput, JSON.stringify(input));
    await assert.rejects(validateProject(missingInput), /ENOENT/);
  } finally {await rm(dir, {recursive: true, force: true});}
});
test('npm install/ci lifecycle skips preparation but explicit npm run prepare executes it', () => {
  const args = ['--import', 'tsx', 'scripts/cli.ts', 'prepare', '--project', '/tmp/video-creator-project-that-does-not-exist.json'];
  for (const command of ['install', 'ci']) {
    const output = execFileSync(process.execPath, args, {env: {...process.env, npm_lifecycle_event: 'prepare', npm_command: command}, encoding: 'utf8'});
    assert.match(output, /run npm run prepare explicitly/);
  }
  assert.throws(() => execFileSync(process.execPath, args, {env: {...process.env, npm_lifecycle_event: 'prepare', npm_command: 'run'}, stdio: 'pipe'}), (error: any) => error.status === 1 && /Project not found/.test(error.stderr.toString()));
});
test('character schema checks actor/prop/segment references and conflicting motion', () => {
  const invalid = (change: (scene: any) => void) => {const input = structuredClone(storyInput); change(input.scenes[0]); assert.throws(() => projectSchema.parse(input));};
  invalid((s) => {s.actions[0].actorId = 'missing';});
  invalid((s) => {delete s.actions[0].toX;});
  invalid((s) => {s.actions[0].to = 0;});
  invalid((s) => {s.actions[3].propId = 'missing';});
  invalid((s) => {s.narration[0].speakerId = 'missing';});
  invalid((s) => {s.actions.push({...s.actions[0]});});
  invalid((s) => {s.actions.push({...s.actions[3], segmentId: 'finish', from: 0.65, to: 1});});
});
test('two-bone IK preserves segment lengths for reachable arm/leg targets', () => {
  const start = {x: 52, y: -260}, target = {x: 90, y: -205};
  const elbow = jointBetween(start, target, 82, 82);
  assert.ok(Math.abs(Math.hypot(elbow.x - start.x, elbow.y - start.y) - 82) < 1e-8);
  assert.ok(Math.abs(Math.hypot(elbow.x - target.x, elbow.y - target.y) - 82) < 1e-8);
});
test('mouth data validates timing, rests outside speech, and is not a periodic flap', () => {
  const cues = parseMouthCues([{start: 0, end: 0.2, value: 'X'}, {start: 0.2, end: 0.5, value: 'D'}, {start: 0.5, end: 0.7, value: 'F'}], 1);
  assert.equal(mouthAt(cues, 0.1), 'X'); assert.equal(mouthAt(cues, 0.3), 'D');
  assert.equal(mouthAt(cues, 0.6), 'F'); assert.equal(mouthAt(cues, 1), 'X');
  assert.throws(() => parseMouthCues([{start: 0.5, end: 0.2, value: 'D'}], 1));
  assert.throws(() => parseMouthCues([{start: 0, end: 2, value: 'D'}], 1));
  assert.throws(() => parseMouthCues([{start: 0, end: 0.5, value: 'D'}, {start: 0.3, end: 0.7, value: 'A'}], 1));
});
test('character movement is seekable, audio-relative, and a carried parcel follows the hand', () => {
  const video = buildTimeline(story, story.scenes[0].narration.map((s) => ({sceneId: 'hello', segmentId: s.id, duration: 4, src: 'voice.mp3', mouthCues: [{start: 0, end: 4, value: 'D' as const}]})));
  const scene = story.scenes[0]; if (scene.layout !== 'character') throw new Error('Expected character');
  const greeting = video.cues[0];
  const mid = stageState(scene, video.cues, greeting.startFrame + 25, 30);
  assert.ok(mid.actors[0].x > 380 && mid.actors[0].x < 800);
  assert.ok(mid.actors[0].walking > 0); assert.equal(mid.actors[0].mouth, 'D');
  const before = stageState(scene, video.cues, 0, 30); assert.equal(before.actors[0].mouth, 'X');
  const frame = video.cues[3].startFrame + 60;
  const held = stageState(scene, video.cues, frame, 30);
  const actor = held.actors[0], box = held.props[0];
  assert.ok(Math.abs((box.x - 40 * box.scale) - (actor.x + actor.rightHand.x * actor.scale)) < 1e-6);
  assert.ok(Math.abs((box.y - 35 * box.scale) - (actor.y + (actor.rightHand.y + actor.bob) * actor.scale)) < 1e-6);
  assert.deepEqual(stageState(scene, video.cues, frame, 30), held);
  validatePickupReach(scene, video.cues, 30);
  const unreachable = {...scene, props: scene.props.map((p) => ({...p, x: 1850}))};
  assert.throws(() => validatePickupReach(unreachable, video.cues, 30), /out of arm reach/);
  const expanded = video.cues.map((c) => ({...c, startFrame: c.startFrame * 2, endFrame: c.endFrame * 2}));
  assert.equal(actionWindows(scene, expanded)[0].end, actionWindows(scene, video.cues)[0].end * 2);
});
test('Studio snapshot has extractable editable defaultProps and supports saving with Remotion codemods', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'video-creator-studio-'));
  try {
    const video = buildTimeline(project, project.scenes.flatMap((s) => s.narration.map((seg) => ({sceneId: s.id, segmentId: seg.id, src: 'audio.mp3', duration: 1}))));
    const entry = await createStudioEntry(video, dir);
    assert.match(await readFile(entry, 'utf8'), /registerRoot\(RemotionRoot\)/);
    const file = path.join(dir, 'StudioRoot.tsx');
    const source = await readFile(file, 'utf8');
    assert.equal(CodemodsInternals.computeCanUpdateDefaultPropsFromContent(source, 'Presentation').canUpdate, true);
    const updated = {...video, project: {...project, title: 'Saved from Studio'}};
    const result = setCompositionDefaultProps({project: {files: {[file]: source}, rootDir: dir}, compositionFile: file, compositionId: 'Presentation', defaultProps: {video: JSON.parse(JSON.stringify(updated))}});
    assert.equal(result.changes.length, 1);
    assert.match(result.changes[0].nextContents!, /Saved from Studio/);
    assert.equal(CodemodsInternals.computeCanUpdateDefaultPropsFromContent(result.changes[0].nextContents!, 'Presentation').canUpdate, true);
    // Snapshot edits never write to the JSON script used by CLI rendering.
    assert.equal(project.title, 'Video Creator');
  } finally {await rm(dir, {recursive: true, force: true});}
});
test('oversized project JSON is rejected before parsing or TTS', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'video-creator-size-'));
  try {
    const file = path.join(dir, 'oversized.json');
    await writeFile(file, ' '.repeat(1024 * 1024 + 1));
    await assert.rejects(validateProject(file), /exceeds 1 MiB/);
  } finally {await rm(dir, {recursive: true, force: true});}
});
test('project rejects unknown fields, duplicate IDs and nonfinite/unsupported values', () => {
  assert.throws(() => projectSchema.parse({...example, fps: 0}));
  assert.throws(() => projectSchema.parse({...example, arbitraryCode: 'eval'}));
  assert.throws(() => projectSchema.parse({...example, scenes: [example.scenes[0], example.scenes[0]]}));
  const scene = {...example.scenes[0], narration: [example.scenes[0].narration[0], example.scenes[0].narration[0]]};
  assert.throws(() => projectSchema.parse({...example, scenes: [scene]}));
});
test('segments inherit project voice instead of materializing the global default', () => {
  const configured = projectSchema.parse({...example, voice: 'capcut:vi_female_huong'});
  const segment = configured.scenes[0].narration[0];
  assert.equal(segment.voice, undefined);
  assert.equal(segment.voice ?? configured.voice, 'capcut:vi_female_huong');
  assert.notEqual(cacheKey(segment, configured), cacheKey(segment, project));
});
test('timeline rounds up audio frames, preserves padding, does not overlap and SRT matches cues', () => {
  const tiny = projectSchema.parse({...example, scenes: [example.scenes[0]]});
  const video = buildTimeline(tiny, tiny.scenes[0].narration.map((seg) => ({sceneId: 'opening', segmentId: seg.id, duration: 1.001, src: 'audio.mp3'})));
  assert.equal(video.cues[0].startFrame, 15);
  assert.equal(video.cues[0].endFrame, 46);
  assert.equal(video.cues[1].startFrame, 54);
  assert.equal(video.durationInFrames, 108);
  assert.match(toSrt(video), /00:00:00,500 -->/);
  assert.match(toSrt(video), /--> 00:00:01,533/);
  assert.throws(() => buildTimeline(tiny, []), /Missing/);
  assert.throws(() => buildTimeline(tiny, [{sceneId: 'opening', segmentId: 'hello', duration: Infinity, src: 'bad'}]), /invalid/);
});
test('captions wrap without changing words and reject overflow', () => {
  for (const scene of project.scenes) for (const seg of scene.narration) {
    const caption = wrapCaption(seg.text);
    assert.equal(caption.replaceAll('\n', ' '), seg.text);
    assert.ok(caption.split('\n').length <= 3);
  }
  assert.throws(() => wrapCaption('x'.repeat(53)), /Caption/);
  assert.throws(() => wrapCaption('a '.repeat(150)), /Caption/);
});
test('cache keys survive reordering but change with text, voice or speed', () => {
  const segment = project.scenes[0].narration[0];
  const key = cacheKey(segment, project);
  assert.equal(key, cacheKey({...segment, id: 'moved'}, {...project, scenes: [...project.scenes].reverse()}));
  assert.notEqual(key, cacheKey({...segment, text: 'Nội dung khác.'}, project));
  assert.notEqual(key, cacheKey({...segment, speed: 1.2}, project));
  assert.notEqual(key, cacheKey({...segment, voice: 'capcut:vi_female_huong'}, project));
});
test('XML and header signing match reference fixed values', () => {
  assert.equal(escapeXml('&<>"\''), '&amp;&lt;&gt;&quot;&apos;');
  // Fixed vector computed with the original Python make_sign_header helper.
  assert.equal(headerSign('https://example.com/lv/v1/common_task/new?q=1', '8.7.0', '123', '456'), '2a7f148344f1b479663545af1484fb57');
  const ssml = makeSsml(' A & B ', resolveVoice(project.voice!), 1);
  assert.match(ssml, /rate="1.00">A &amp; B/);
});

const response = (value: object, status = 200) => new Response(JSON.stringify(value), {status, headers: {'content-type': 'application/json'}});
test('CapCut creates only one task and retries query then downloads a single audio', async () => {
  let creates = 0, queries = 0;
  const mock: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('/new?')) {creates++; const body = JSON.parse(String(init?.body)); assert.equal(body.tasks.length, 1); return response({ret: 0, data: {tasks: [{id: 'task', token: 'private'}]}});}
    if (url.includes('/query?')) {
      queries++;
      if (queries === 1) return response({}, 503);
      return response({ret: 0, data: {tasks: [{status: 'success', payload: JSON.stringify({audio_subtitles: [{speech_url: 'https://audio.example/voice.mp3'}]})}]}});
    }
    assert.equal(init?.headers, undefined, 'do not forward API headers to audio host');
    return new Response('audio-bytes');
  };
  const bytes = await synthesize('Xin chào', project.voice!, 1, {fetch: mock, pollMs: 1});
  assert.equal(bytes.toString(), 'audio-bytes'); assert.equal(creates, 1); assert.equal(queries, 2);
});
test('CapCut create failure is not retried, errors do not become silent audio', async () => {
  let calls = 0;
  await assert.rejects(synthesize('Xin chào', project.voice!, 1, {fetch: async () => {calls++; return response({}, 503);}}), /HTTP 503/);
  assert.equal(calls, 1);
  await assert.rejects(synthesize('Xin chào', project.voice!, 1, {fetch: async () => response({ret: 9, errmsg: 'rejected'})}), /ret=9/);
});
test('CapCut reports task failures and malformed results', async () => {
  for (const task of [{status: 'failed', err_code: 40402004, err_msg: 'TTSInvalidSpeaker'}, {status: 'success', payload: {audio_subtitles: []}}]) {
    const mock: typeof fetch = async (url) => response({ret: 0, data: {tasks: [String(url).includes('/new?') ? {id: 'task', token: 'private'} : task]}});
    await assert.rejects(synthesize('Xin chào', project.voice!, 1, {fetch: mock}), /failed|exactly one/);
  }
});
test('CapCut has a total deadline and supports cancellation', async () => {
  const mock: typeof fetch = async (url) => response({ret: 0, data: {tasks: [String(url).includes('/new?') ? {id: 'task', token: 'private'} : {status: 'pending'}]}});
  await assert.rejects(synthesize('Xin chào', project.voice!, 1, {fetch: mock, pollMs: 5, timeoutMs: 25}));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(synthesize('Xin chào', project.voice!, 1, {fetch: mock, signal: controller.signal}), /abort/i);
});

test('real audio preparation caches, survives reordering, regenerates changed/corrupt audio, and reports failures', async () => {
  const originalDir = process.cwd();
  const originalFetch = globalThis.fetch;
  const dir = await mkdtemp(path.join(tmpdir(), 'video-creator-test-'));
  const tone = path.join(dir, 'tone.mp3');
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.3', tone]);
  const bytes = await readFile(tone);
  let fail = false, creates = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes('/new?')) {creates++; return fail ? response({ret: 9, errmsg: 'test failure'}) : response({ret: 0, data: {tasks: [{id: 'task', token: 'private'}]}});}
    if (String(url).includes('/query?')) return response({ret: 0, data: {tasks: [{status: 'success', payload: {audio_subtitles: [{speech_url: 'https://test.example/audio.mp3'}]}}]}});
    return new Response(bytes);
  };
  try {
    process.chdir(dir);
    await mkdir('example');
    await mkdir('example/assets');
    await writeFile('example/assets/icon.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
    const fontBytes = await readFile(path.join(originalDir, 'public/fonts/NotoSans-Regular.ttf'));
    await writeFile('example/font.ttf', fontBytes);
    const input = {...example, font: 'font.ttf', scenes: [{...example.scenes[0], narration: [example.scenes[0].narration[0]]}, example.scenes[5]]};
    const file = path.join(dir, 'example/project.json');
    await writeFile(file, JSON.stringify(input));
    const first = await prepareProject(file);
    assert.equal(first.report.generated, 2); assert.equal(creates, 2);
    assert.ok(first.video.project.font?.startsWith('generated/'));
    assert.deepEqual(await readFile(path.join(first.publicDir, first.video.project.font!)), fontBytes);
    assert.equal(await readFile(path.join(first.publicDir, 'assets/icon.svg'), 'utf8'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    await assert.rejects(access(first.outputDir));
    assert.equal(await readFile(file, 'utf8'), JSON.stringify(input));
    const cached = await prepareProject(file);
    assert.equal(cached.report.cacheHits, 2); assert.equal(cached.report.ttsHttpRequests, 0);
    input.scenes.reverse(); await writeFile(file, JSON.stringify(input));
    const moved = await prepareProject(file);
    assert.equal(moved.report.cacheHits, 2); assert.equal(creates, 2);
    input.scenes[0].narration[0].text = 'Nội dung mới.'; await writeFile(file, JSON.stringify(input));
    const changed = await prepareProject(file);
    assert.equal(changed.report.generated, 1); assert.equal(changed.report.cacheHits, 1);
    const parsed = projectSchema.parse(input);
    await writeFile(path.join('.cache/tts', `${cacheKey(parsed.scenes[0].narration[0], parsed)}.mp3`), 'broken');
    const repaired = await prepareProject(file);
    assert.equal(repaired.report.generated, 1);
    fail = true; input.scenes[0].narration[0].text = 'Đoạn sẽ bị lỗi.'; await writeFile(file, JSON.stringify(input));
    await assert.rejects(prepareProject(file), /closing\/finish.*ret=9/);
    const reports = await Promise.all((await readdir('example/.work')).map(async (run) => JSON.parse(await readFile(path.join('example/.work', run, 'report.json'), 'utf8'))));
    const failed = reports.find((r) => r.status === 'failed');
    assert.equal(failed.segments[0].status, 'failed');
    assert.equal((await readdir(failed.workDir)).includes('prepared.json'), false);
    const bad = projectSchema.parse(input);
    assert.equal((await readdir('.cache/tts')).includes(`${cacheKey(bad.scenes[0].narration[0], bad)}.mp3`), false);
  } finally {
    process.chdir(originalDir); globalThis.fetch = originalFetch;
    await rm(dir, {recursive: true, force: true});
  }
});

test('phone dimensions and sentence captions preserve audio and have no overlapping pages', () => {
  for (const [width, height] of [[1080, 1920], [1080, 1350], [1080, 1080], [1920, 1080]]) {
    const p = projectSchema.parse({id: 'phone', title: 'Phone', width, height, scenes: [{id: 's', title: 'Title', layout: 'title', narration: [{id: 'n', audio: 'local.mp3', text: 'First sentence. Second sentence is long enough to need several short caption pages on a phone screen.'}]}]});
    const video = buildTimeline(p, [{sceneId: 's', segmentId: 'n', src: 'local.mp3', duration: 8}]);
    const captions = captionCues(video);
    assert.equal(video.cues.length, 1);
    assert.equal(captions[0].text, 'First sentence.');
    assert.equal(captions[0].startFrame, video.cues[0].startFrame);
    assert.equal(captions.at(-1)!.endFrame, video.cues[0].endFrame);
    assert.equal(captions.map(c => c.text).join(' '), video.cues[0].text);
    captions.forEach((c, i) => {
      assert.ok(c.endFrame > c.startFrame);
      assert.ok(c.text.length <= (width < height ? 32 : 52));
      if (i) assert.equal(c.startFrame, captions[i - 1].endFrame);
    });
    assert.equal(toSrt(video).split('-->').length - 1, captions.length);
  }
  for (const width of [0, 241, 1080.5, 4000]) assert.throws(() => projectSchema.parse({...example, width}));
});
