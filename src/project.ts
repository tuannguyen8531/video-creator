import {z} from 'zod';

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const text = (max: number) => z.string().trim().min(1).max(max);
const language = text(35).refine((value) => {try {new Intl.Locale(value); return true;} catch {return false;}}, 'Expected a language tag such as vi-VN or en-US').transform((value) => new Intl.Locale(value).toString());
const segment = z.object({
  id, text: text(240), voice: text(120).optional(), speed: z.number().min(0.5).max(2).optional(),
  pauseAfter: z.number().min(0).max(5).default(0.25), audio: text(500).optional(), speakerId: id.optional(), language: language.optional(),
}).strict();
const common = {
  id, title: text(90), eyebrow: text(40).optional(),
  narration: z.array(segment).max(30).default([]), duration: z.number().min(0.1).max(600).optional(),
  effect: z.enum(['fade', 'slide', 'zoom', 'spring']).default('spring'),
};
const color = z.string().regex(/^#[\da-fA-F]{6}$/);
const action = z.object({
  actorId: id, segmentId: id, kind: z.enum(['walk', 'wave', 'point', 'pick-up', 'expression']),
  from: z.number().min(0).max(1).default(0), to: z.number().min(0).max(1).default(1),
  toX: z.number().min(-200).max(2120).optional(), propId: id.optional(),
  emotion: z.enum(['neutral', 'happy', 'curious', 'surprised']).optional(),
}).strict();
const scene = z.discriminatedUnion('layout', [
  z.object({...common, layout: z.literal('custom'), component: text(500), props: z.record(z.string(), z.unknown()).default({}), captions: z.boolean().default(true), lipSync: z.boolean().default(false)}).strict(),
  z.object({...common, layout: z.literal('title'), subtitle: text(180).optional()}).strict(),
  z.object({...common, layout: z.literal('image-and-text'), image: text(500), body: text(320)}).strict(),
  z.object({...common, layout: z.literal('bullets'), bullets: z.array(text(100)).min(1).max(5)}).strict(),
  z.object({...common, layout: z.literal('stat'), value: z.number().finite().min(-1e9).max(1e9), suffix: z.string().max(16).default(''), label: text(120)}).strict(),
  z.object({...common, layout: z.literal('comparison'), left: z.object({title: text(40), items: z.array(text(80)).min(1).max(4)}).strict(), right: z.object({title: text(40), items: z.array(text(80)).min(1).max(4)}).strict()}).strict(),
  z.object({...common, layout: z.literal('outro'), subtitle: text(180).optional(), cta: text(80)}).strict(),
  z.object({...common, layout: z.literal('character'),
    setting: z.literal('office').default('office'),
    actors: z.array(z.object({id, name: text(40), x: z.number().min(-200).max(2120), y: z.number().min(550).max(820).default(790), scale: z.number().min(0.6).max(1.3).default(1), shirtColor: color.default('#297d91'), hairColor: color.default('#303046'), skinColor: color.default('#efb994')}).strict()).min(1).max(3),
    props: z.array(z.object({id, kind: z.enum(['parcel', 'plant', 'lamp']), x: z.number().min(0).max(1920), y: z.number().min(300).max(830), scale: z.number().min(0.3).max(2).default(1)}).strict()).max(12).default([]),
    actions: z.array(action).max(60).default([]),
  }).strict(),
]);
export const projectSchema = z.object({
  id, title: text(120), width: z.literal(1920).default(1920), height: z.literal(1080).default(1080), fps: z.literal(30).default(30),
  voice: text(120).optional(), language: language.optional(), font: text(500).optional(), speed: z.number().min(0.5).max(2).default(1),
  theme: z.object({background: z.string().regex(/^#[\da-fA-F]{6}$/).default('#0b1120'), accent: z.string().regex(/^#[\da-fA-F]{6}$/).default('#64e8c1'), foreground: z.string().regex(/^#[\da-fA-F]{6}$/).default('#f1f5f9')}).strict().default({background: '#0b1120', accent: '#64e8c1', foreground: '#f1f5f9'}),
  scenes: z.array(scene).min(1).max(100),
}).strict().superRefine((project, ctx) => {
  const seen = new Set<string>();
  project.scenes.forEach((scene, i) => {
    if (seen.has(scene.id)) ctx.addIssue({code: 'custom', path: ['scenes', i, 'id'], message: `Duplicate scene ID: ${scene.id}`});
    seen.add(scene.id);
    if (!scene.narration.length && scene.duration === undefined) ctx.addIssue({code: 'custom', path: ['scenes', i, 'duration'], message: 'Scenes without narration need an explicit duration in seconds'});
    const segments = new Set<string>();
    scene.narration.forEach((seg, j) => {
      if (segments.has(seg.id)) ctx.addIssue({code: 'custom', path: ['scenes', i, 'narration', j, 'id'], message: `Duplicate segment ID: ${seg.id}`});
      segments.add(seg.id);
      if (!seg.audio && !seg.voice && !project.voice) ctx.addIssue({code: 'custom', path: ['scenes', i, 'narration', j, 'voice'], message: 'Choose a voice for this segment or the project; no voice is selected automatically'});
    });
    if (scene.layout === 'character') {
      const actors = new Set(scene.actors.map((a) => a.id));
      const props = new Map(scene.props.map((p) => [p.id, p]));
      const fail = (message: string) => ctx.addIssue({code: 'custom', path: ['scenes', i], message});
      if (actors.size !== scene.actors.length || props.size !== scene.props.length) fail('Duplicate actor/prop IDs');
      for (const seg of scene.narration) if (seg.speakerId && !actors.has(seg.speakerId)) fail(`Unknown speaker: ${seg.speakerId}`);
      for (const a of scene.actions) {
        if (!actors.has(a.actorId) || !segments.has(a.segmentId)) fail('Action references unknown actor/segment');
        if (a.to <= a.from) fail('Action to must be greater than from');
        if (a.kind === 'walk' && a.toX === undefined) fail('Walk requires toX');
        if ((a.kind === 'point' || a.kind === 'pick-up') && (!a.propId || !props.has(a.propId))) fail('Point/pick-up requires an existing propId');
        if (a.kind === 'pick-up' && props.get(a.propId!)?.kind !== 'parcel') fail('Only parcels can be picked up');
        if (a.kind === 'expression' && !a.emotion) fail('Expression requires emotion');
      }
      const ordered = [...scene.actions].sort((a, b) => scene.narration.findIndex((n) => n.id === a.segmentId) + a.from - scene.narration.findIndex((n) => n.id === b.segmentId) - b.from);
      const carried = new Set<string>(), occupied = new Set<string>();
      const intervals = new Map<string, number>();
      for (const a of ordered) {
        const index = scene.narration.findIndex((n) => n.id === a.segmentId);
        const start = index + a.from, end = index + a.to;
        const channel = a.kind === 'walk' ? 'legs' : a.kind === 'wave' ? 'left-arm' : a.kind === 'point' || a.kind === 'pick-up' ? 'right-arm' : null;
        if (channel) {
          const key = `${a.actorId}/${channel}`;
          if ((intervals.get(key) ?? -1) > start) fail(`Overlapping ${channel} actions for ${a.actorId}`);
          intervals.set(key, end);
        }
        if (a.kind === 'point' && occupied.has(a.actorId)) fail('Cannot point while holding a parcel; this rig has no release action yet');
        if (a.kind === 'pick-up') {
          if (carried.has(a.propId!) || occupied.has(a.actorId)) fail('Parcel/hand already occupied');
          carried.add(a.propId!); occupied.add(a.actorId);
        }
      }
    }
  });
});
export type Project = z.infer<typeof projectSchema>;
export type Scene = Project['scenes'][number];
export type Segment = Scene['narration'][number];
export type MouthCue = {start: number; end: number; value: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'X'};
export type Cue = {sceneId: string; segmentId: string; text: string; startFrame: number; endFrame: number; audio: string; language?: string; voice?: string; mouthCues?: MouthCue[]};
export type PreparedScene = {scene: Scene; from: number; durationInFrames: number};
export type PreparedVideo = {project: Project; scenes: PreparedScene[]; cues: Cue[]; durationInFrames: number};

export function buildTimeline(project: Project, audio: {sceneId: string; segmentId: string; src: string; duration: number; language?: string; voice?: string; mouthCues?: MouthCue[]}[]): PreparedVideo {
  const cues: Cue[] = [];
  const scenes: PreparedScene[] = [];
  let cursor = 0;
  const pad = Math.round(project.fps * 0.5);
  for (const scene of project.scenes) {
    const from = cursor;
    if (!scene.narration.length) {
      cursor += Math.max(1, Math.ceil(scene.duration! * project.fps));
      scenes.push({scene, from, durationInFrames: cursor - from});
      continue;
    }
    cursor += pad;
    for (const segment of scene.narration) {
      const item = audio.find((a) => a.sceneId === scene.id && a.segmentId === segment.id);
      if (!item || !Number.isFinite(item.duration) || item.duration <= 0) throw new Error(`Missing/invalid audio: ${scene.id}/${segment.id}`);
      const duration = Math.ceil(item.duration * project.fps);
      cues.push({sceneId: scene.id, segmentId: segment.id, text: segment.text, audio: item.src, startFrame: cursor, endFrame: cursor + duration, language: item.language, voice: item.voice, ...(item.mouthCues ? {mouthCues: item.mouthCues} : {})});
      cursor += duration + Math.round(segment.pauseAfter * project.fps);
    }
    cursor += pad;
    if (scene.duration !== undefined) cursor = Math.max(cursor, from + Math.ceil(scene.duration * project.fps));
    scenes.push({scene, from, durationInFrames: cursor - from});
  }
  return {project, cues, scenes, durationInFrames: cursor};
}

export function wrapCaption(text: string, width = 52): string {
  const lines = [''];
  for (const word of text.split(/\s+/)) {
    const i = lines.length - 1;
    if (lines[i] && lines[i].length + word.length + 1 > width) lines.push(word);
    else lines[i] += (lines[i] ? ' ' : '') + word;
  }
  if (lines.length > 3 || lines.some((line) => line.length > width)) throw new Error('Caption exceeds 3 lines of 52 characters; split the narration into shorter segments');
  return lines.join('\n');
}

export function toSrt(video: PreparedVideo): string {
  const time = (frame: number) => {
    const ms = Math.round(frame / video.project.fps * 1000);
    return `${Math.floor(ms / 3600000).toString().padStart(2, '0')}:${Math.floor(ms / 60000 % 60).toString().padStart(2, '0')}:${Math.floor(ms / 1000 % 60).toString().padStart(2, '0')},${(ms % 1000).toString().padStart(3, '0')}`;
  };
  return video.cues.map((c, i) => `${i + 1}\n${time(c.startFrame)} --> ${time(c.endFrame)}\n${wrapCaption(c.text)}\n`).join('\n');
}
