import type {Cue, MouthCue, Scene} from '../project';

export type CharacterScene = Extract<Scene, {layout: 'character'}>;
export type Point = {x: number; y: number};
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => {const p = clamp01(x); return p * p * (3 - 2 * p);};
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const mixPoint = (a: Point, b: Point, p: number): Point => ({x: mix(a.x, b.x, p), y: mix(a.y, b.y, p)});

// Two-bone IK keeps elbows and knees attached while their targets move.
export function jointBetween(start: Point, target: Point, upper: number, lower: number, bend = 1): Point {
  const dx = target.x - start.x, dy = target.y - start.y;
  const distance = Math.max(0.001, Math.min(Math.hypot(dx, dy), upper + lower - 0.001));
  const angle = Math.atan2(dy, dx) + bend * Math.acos(Math.max(-1, Math.min(1, (upper * upper + distance * distance - lower * lower) / (2 * upper * distance))));
  return {x: start.x + Math.cos(angle) * upper, y: start.y + Math.sin(angle) * upper};
}

export function mouthAt(cues: MouthCue[] | undefined, seconds: number): MouthCue['value'] {
  return cues?.find((c) => seconds >= c.start && seconds < c.end)?.value ?? 'X';
}

export function actionWindows(scene: CharacterScene, cues: Cue[]) {
  return scene.actions.map((action) => {
    const cue = cues.find((c) => c.sceneId === scene.id && c.segmentId === action.segmentId);
    if (!cue) throw new Error(`No cue for action segment ${scene.id}/${action.segmentId}`);
    return {...action, start: mix(cue.startFrame, cue.endFrame, action.from), end: mix(cue.startFrame, cue.endFrame, action.to)};
  }).sort((a, b) => a.start - b.start);
}

export function stageState(scene: CharacterScene, cues: Cue[], frame: number, fps: number) {
  const windows = actionWindows(scene, cues);
  const actors = scene.actors.map((actor) => {
    let x = actor.x, gait = 0, walking = 0;
    let emotion: 'neutral' | 'happy' | 'curious' | 'surprised' = 'neutral';
    for (const a of windows.filter((a) => a.actorId === actor.id && frame >= a.start)) {
      const p = smooth((frame - a.start) / (a.end - a.start));
      if (a.kind === 'walk') {
        const distance = a.toX! - x;
        x = mix(x, a.toX!, p);
        if (frame < a.end) {walking = Math.sin(Math.PI * clamp01((frame - a.start) / (a.end - a.start))) ** 0.3; gait = (distance * p / actor.scale) / 23;}
      }
      if (a.kind === 'expression') emotion = a.emotion!;
    }
    const cue = cues.find((c) => c.sceneId === scene.id && frame >= c.startFrame && frame < c.endFrame &&
      (scene.narration.find((n) => n.id === c.segmentId)?.speakerId ?? scene.actors[0].id) === actor.id);
    const mouth = cue ? mouthAt(cue.mouthCues, (frame - cue.startFrame) / fps) : 'X';
    const leftHand = {x: -68 + Math.sin(gait + Math.PI) * 28 * walking, y: -129};
    const rightHand = {x: 68 + Math.sin(gait) * 28 * walking, y: -129};
    const bob = -Math.abs(Math.sin(gait)) * 6 * walking + Math.sin(frame / fps * 2.3) * 1.5 * (1 - walking);
    return {...actor, x, gait, walking, bob, emotion, mouth, leftHand, rightHand, leftGesture: 'rest', rightGesture: 'rest', pointAngle: 0, gazeX: 0, gazeY: 0};
  });
  const props = scene.props.map((prop) => {
    let position = {x: prop.x, y: prop.y};
    for (const a of windows.filter((a) => a.kind === 'pick-up' && a.propId === prop.id && frame >= a.start)) {
      const actor = actors.find((actor) => actor.id === a.actorId)!;
      const held = {x: actor.x + 90 * actor.scale + 40 * prop.scale, y: actor.y + (actor.bob - 205) * actor.scale + 35 * prop.scale};
      const p = smooth(((frame - a.start) / (a.end - a.start) - 0.45) / 0.55);
      position = mixPoint(position, held, p);
    }
    return {...prop, ...position};
  });
  for (const actor of actors) {
    for (const a of windows.filter((a) => a.actorId === actor.id && frame >= a.start)) {
      const t = (frame - a.start) / (a.end - a.start);
      const envelope = Math.sin(Math.PI * clamp01(t)) ** 0.35;
      if (a.kind === 'wave' && t < 1) {
        actor.leftHand = mixPoint(actor.leftHand, {x: -125 + Math.sin(t * Math.PI * 8) * 14, y: -345 + Math.cos(t * Math.PI * 8) * 8}, envelope);
        actor.leftGesture = envelope > 0.3 ? 'open' : 'rest';
      }
      if ((a.kind === 'point' && t < 1) || a.kind === 'pick-up') {
        const prop = props.find((p) => p.id === a.propId)!;
        const target = {x: (prop.x - actor.x - (a.kind === 'pick-up' ? 40 * prop.scale : 0)) / actor.scale,
          y: (prop.y - actor.y - 35 * prop.scale) / actor.scale - actor.bob};
        if (a.kind === 'point') {
          const shoulder = {x: 52, y: -260};
          const distance = Math.max(1, Math.hypot(target.x - shoulder.x, target.y - shoulder.y));
          const reach = Math.min(distance, 146);
          actor.rightHand = mixPoint(actor.rightHand, {x: 52 + (target.x - 52) / distance * reach, y: -260 + (target.y + 260) / distance * reach}, envelope);
          actor.rightGesture = envelope > 0.3 ? 'point' : 'rest';
          actor.pointAngle = Math.atan2(target.y - actor.rightHand.y, target.x - actor.rightHand.x) * 180 / Math.PI;
        } else actor.rightHand = mixPoint(actor.rightHand, target, smooth(t / 0.45));
        actor.gazeX = Math.sign(target.x) * 3 * (a.kind === 'point' ? envelope : Math.max(0, 1 - t));
        actor.gazeY = 2 * (a.kind === 'point' ? envelope : Math.max(0, 1 - t));
      }
    }
  }
  return {actors, props};
}

export function validatePickupReach(scene: CharacterScene, cues: Cue[], fps: number) {
  for (const action of actionWindows(scene, cues).filter((a) => a.kind === 'pick-up')) {
    const contact = action.start + (action.end - action.start) * 0.45;
    const state = stageState(scene, cues, contact, fps);
    const actor = state.actors.find((a) => a.id === action.actorId)!;
    const prop = state.props.find((p) => p.id === action.propId)!;
    const x = (prop.x - 40 * prop.scale - actor.x) / actor.scale;
    const y = (prop.y - 35 * prop.scale - actor.y) / actor.scale - actor.bob;
    if (Math.hypot(x - 52, y + 260) > 160) throw new Error(`${scene.id}/${action.actorId}: parcel ${prop.id} is out of arm reach; move the actor closer before pick-up`);
  }
}
