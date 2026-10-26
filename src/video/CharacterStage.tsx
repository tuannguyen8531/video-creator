import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {jointBetween, stageState, type CharacterScene, type Point} from '../animation/motion';
import {type PreparedScene, type PreparedVideo, type MouthCue} from '../project';

const line = (a: Point, b: Point) => `M${a.x},${a.y} L${b.x},${b.y}`;
function Arm({side, hand, shirt, skin, gesture, angle = 0}: {side: number; hand: Point; shirt: string; skin: string; gesture: string; angle?: number}) {
  const shoulder = {x: side * 51, y: -260};
  const elbow = jointBetween(shoulder, hand, 82, 82, side);
  return <g strokeLinecap="round" strokeLinejoin="round">
    <path d={line(shoulder, elbow)} stroke="#182a3b" strokeWidth={37} />
    <path d={line(shoulder, elbow)} stroke={shirt} strokeWidth={32} />
    <path d={line(elbow, hand)} stroke="#aa7965" strokeWidth={25} />
    <path d={line(elbow, hand)} stroke={skin} strokeWidth={21} />
    <circle cx={elbow.x} cy={elbow.y} r={14} fill={shirt} />
    <g transform={`translate(${hand.x},${hand.y}) rotate(${gesture === 'point' ? angle : 0})`} fill={skin} stroke="#ae7b65" strokeWidth={2}>
      {gesture === 'open' ? <><path d="M-10,16L-15,0L-23,-12Q-24,-18 -18,-17L-10,-7L-13,-31Q-12,-38 -7,-32L-3,-13L-4,-38Q-1,-45 3,-38L5,-13L7,-35Q11,-41 13,-33L13,-10L18,-26Q24,-30 24,-23L19,4Q16,18 5,19Z"/><path d="M-3,1Q8,-3 14,4" fill="none" stroke="#c38f76"/></> : gesture === 'point' ? <path d="M-11,13L-12,-8Q-10,-16 -2,-14L29,-13Q37,-8 29,-5L6,-4L14,1Q22,8 12,15L-1,20Z"/> : <><ellipse rx={13} ry={16}/><path d="M-8,-2q-5,-15 -11,-7q-3,8 9,16"/><path d="M3,-7v11m5,-10v10" stroke="#bc8b73" strokeWidth={1.3}/></>}
    </g>
  </g>;
}
function Leg({side, phase, walking}: {side: number; phase: number; walking: number}) {
  const hip = {x: side * 25, y: -135};
  const foot = {x: side * 26 + Math.sin(phase) * 36 * walking, y: -Math.max(0, Math.cos(phase)) * 28 * walking};
  const knee = jointBetween(hip, foot, 68, 73, -1);
  return <g strokeLinecap="round" strokeLinejoin="round">
    <path d={`${line(hip, knee)} L${foot.x},${foot.y - 19}`} stroke="#273345" strokeWidth={38}/>
    <path d={line({x: hip.x - 8, y: hip.y + 8}, {x: knee.x - 8, y: knee.y})} stroke="#ffffff10" strokeWidth={3}/>
    <g transform={`translate(${foot.x},${foot.y}) rotate(${Math.sin(phase) * walking * 9})`}>
      <path d="M-21,-16Q-5,-23 13,-13L30,-5Q37,0 30,7H-24Q-30,0 -21,-16" fill="#faf3e3" stroke="#d9d5d0" strokeWidth={2}/>
      <path d="M-25,5H31" stroke="#adb4b4" strokeWidth={5}/><path d="M-6,-14l13,3m-15,2 13,3" stroke="#c8c9bf" strokeWidth={2}/>
    </g>
  </g>;
}
function Mouth({shape, emotion}: {shape: MouthCue['value']; emotion: string}) {
  if (shape === 'A' || shape === 'X') return <path d={emotion === 'happy' ? 'M-15,3 Q0,17 15,3' : emotion === 'surprised' ? 'M-5,0 Q-10,15 0,17 Q10,15 5,0Z' : 'M-12,4 Q0,10 13,3'} fill={emotion === 'surprised' ? '#673340' : 'none'} stroke="#914c51" strokeWidth={3.5} strokeLinecap="round"/>;
  const sizes = {B: [19, 6], C: [19, 13], D: [20, 22], E: [13, 15], F: [8, 12], G: [16, 7], H: [17, 15]} as const;
  const [w, h] = sizes[shape];
  return <g><ellipse cy={5} rx={w} ry={h} fill="#62313c" stroke="#ad6266" strokeWidth={2.5}/>
    <path d={`M${-w * 0.8},${5 - h * 0.5}Q0,${7 - h * 0.2} ${w * 0.8},${5 - h * 0.5}`} stroke="#fff5de" strokeWidth={shape === 'B' || shape === 'G' ? 6 : 4} fill="none"/>
    {h > 10 && <ellipse cx={2} cy={5 + h * 0.5} rx={w * 0.55} ry={h * 0.23} fill="#df7b89"/>}
    {shape === 'H' && <path d="M-5,8Q0,-5 6,8" fill="#ee8e9c"/>}
  </g>;
}
function Face({mouth, emotion, frame, gazeX, gazeY}: {mouth: MouthCue['value']; emotion: string; frame: number; gazeX: number; gazeY: number}) {
  const blink = frame % 113;
  const eyeOpen = blink < 5 ? Math.max(0.08, Math.abs(blink - 2) / 2) : 1;
  const raised = emotion === 'surprised' ? -8 : emotion === 'curious' ? -5 : 0;
  return <g>
    <ellipse cx={-49} cy={2} rx={13} ry={20} fill="#e6a885"/>
    <ellipse cx={50} cy={2} rx={13} ry={20} fill="#e6a885"/>
    <path d="M-49,-35Q-40,-74 1,-74Q48,-73 51,-34L47,25Q40,67 0,71Q-39,65 -48,25Z" fill="currentColor" stroke="#b7816a" strokeWidth={2}/>
    <ellipse cx={-31} cy={31} rx={14} ry={8} fill="#df8e87" opacity={0.4}/><ellipse cx={33} cy={31} rx={14} ry={8} fill="#df8e87" opacity={0.4}/>
    {[-1, 1].map((side) => <g key={side} transform={`translate(${side * 23},6)`}>
      <g transform={`scale(1,${eyeOpen})`}><ellipse rx={13} ry={18} fill="#fff8ed"/><g transform={`translate(${gazeX},${gazeY})`}><ellipse cx={3} cy={1} rx={7} ry={11} fill="#5c4034"/><ellipse cx={4} cy={2} rx={4} ry={8} fill="#202632"/><circle cx={1} cy={-4} r={3} fill="white"/></g></g>
      <path d="M-13,-9Q-3,-20 12,-11" fill="none" stroke="#40303a" strokeWidth={3.5} strokeLinecap="round"/>
      <path d={`M-13,${-27 + (side === -1 ? raised : 0)}Q0,${-33 + raised} 12,${-26 + raised}`} fill="none" stroke="#3a2d38" strokeWidth={5} strokeLinecap="round"/>
    </g>)}
    <path d="M2,13q-7,14 3,14" fill="none" stroke="#bd886e" strokeWidth={2.5} strokeLinecap="round"/>
    <g transform="translate(2,40)"><Mouth shape={mouth} emotion={emotion}/></g>
  </g>;
}
function Character({actor, frame}: {actor: ReturnType<typeof stageState>['actors'][number]; frame: number}) {
  return <g transform={`translate(${actor.x},${actor.y}) scale(${actor.scale})`}>
    <ellipse cx={2} cy={13} rx={83} ry={13} fill="#162635" opacity={0.12}/>
    <Leg side={-1} phase={actor.gait + Math.PI} walking={actor.walking}/>
    <Leg side={1} phase={actor.gait} walking={actor.walking}/>
    <g transform={`translate(0,${actor.bob}) rotate(${Math.sin(actor.gait) * actor.walking * 1.3},0,-140)`}>
      <path d="M-62,-336Q-86,-285 -61,-246L57,-246Q83,-283 63,-337" fill={actor.hairColor}/>
      <Arm side={-1} hand={actor.leftHand} shirt={actor.shirtColor} skin={actor.skinColor} gesture={actor.leftGesture}/>
      <path d="M-48,-282Q0,-300 49,-282L59,-143Q9,-122 -59,-143Z" fill={actor.shirtColor} stroke="#234458" strokeWidth={3}/>
      <path d="M-42,-259L-37,-163Q0,-147 45,-164L42,-260" fill="#ffffff08"/>
      <path d="M-57,-153Q0,-139 57,-153L56,-131Q0,-121 -57,-131Z" fill="#1d3442"/>
      <path d="M-18,-285L0,-248L20,-285" fill="#fbf2dd"/>
      <path d="M-27,-290L-14,-255L0,-267L14,-254L28,-290" fill="none" stroke="#bbded5" strokeWidth={3}/>
      <path d="M0,-249V-154" stroke="#1b5363" strokeWidth={2}/>
      {[-232, -205, -178].map((y) => <circle key={y} cx={7} cy={y} r={3} fill="#b8dfce"/>)}
      <path d="M-38,-218h23v26h-23Z" fill="#ffffff0c" stroke="#7ca99e" strokeWidth={2}/>
      <path d="M-15,-318V-284Q0,-269 15,-284V-318" fill={actor.skinColor} stroke="#b7816a" strokeWidth={2}/>
      <path d="M-15,-309Q0,-298 15,-309V-296Q0,-288 -15,-296Z" fill="#cf9779"/>
      <Arm side={1} hand={actor.rightHand} shirt={actor.shirtColor} skin={actor.skinColor} gesture={actor.rightGesture} angle={actor.pointAngle}/>
      <g transform={`translate(0,-365) rotate(${actor.emotion === 'curious' ? -6 : Math.sin(frame / 50) * 1.3})`}>
        <path d="M-61,15Q-79,-71 -38,-86Q18,-117 64,-67Q82,-34 61,24L51,47L-53,42Z" fill={actor.hairColor}/>
        <g style={{color: actor.skinColor}}><Face mouth={actor.mouth} emotion={actor.emotion} frame={frame} gazeX={actor.gazeX} gazeY={actor.gazeY}/></g>
        <path d="M-58,-5Q-67,-67 -27,-77Q15,-96 53,-58L59,-3Q35,-20 18,-52Q-10,-16 -52,-12Z" fill={actor.hairColor}/>
        <path d="M-44,-42Q-24,-70 10,-73M24,-68Q43,-59 49,-37" fill="none" stroke="#ffffff16" strokeWidth={5} strokeLinecap="round"/>
        <path d="M-54,-10Q-62,22 -48,43M54,-8Q62,20 47,43" fill="none" stroke={actor.hairColor} strokeWidth={10} strokeLinecap="round"/>
        <circle cx={-49} cy={25} r={5} fill="#f4cd77"/><circle cx={50} cy={25} r={5} fill="#f4cd77"/>
      </g>
    </g>
  </g>;
}

function Prop({prop}: {prop: ReturnType<typeof stageState>['props'][number]}) {
  return <g transform={`translate(${prop.x},${prop.y}) scale(${prop.scale})`}>
    {prop.kind === 'parcel' ? <g><path d="M-48,-74L24,-88L57,-64V-2L-16,13L-48,-8Z" fill="#c99262" stroke="#a16a47" strokeWidth={2}/><path d="M-48,-74L-16,-51L57,-64L24,-88Z" fill="#edc295"/><path d="M-16,-51V13L57,-2V-64Z" fill="#daa576"/><path d="M-14,-80L18,-57V6L31,3V-60L0,-83Z" fill="#f8dbad"/><path d="M-4,-37L-4,-15L28,-21V-43Z" fill="#fff4dc"/><path d="M1,-30l19,-4m-19,10 13,-3" stroke="#a4836c" strokeWidth={2}/></g> : prop.kind === 'plant' ? <g><path d="M0,-42V-180" stroke="#3e7063" strokeWidth={7}/>{[-1, 1].flatMap((s) => [0, 1, 2].map((i) => <path key={`${s}${i}`} d={`M0,${-65 - i * 42}Q${s * 80},${-65 - i * 42} ${s * 48},${-110 - i * 36}Q${s * 8},${-120 - i * 36} 0,${-65 - i * 42}`} fill={s === 1 ? '#73a38a' : '#497d6b'}/>))}<path d="M-40,-52H40L30,0H-30Z" fill="#e2a48b"/><path d="M-44,-54H44V-43H-44Z" fill="#f4bea2"/></g> : <g><path d="M-45,0H45M0,-6V-155" stroke="#7c8e9e" strokeWidth={7}/><path d="M-62,-155H62L33,-230H-33Z" fill="#e7bd75"/><ellipse cy={-155} rx={63} ry={9} fill="#f8dca5"/></g>}
  </g>;
}

export function CharacterStage({item, video}: {item: PreparedScene; video: PreparedVideo}) {
  const local = useCurrentFrame(), frame = local + item.from;
  const scene = item.scene as CharacterScene;
  const state = stageState(scene, video.cues, frame, video.project.fps);
  const fade = interpolate(local, [0, 10, item.durationInFrames - 10, item.durationInFrames - 1], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const zoom = 1 + Math.min(local / item.durationInFrames, 1) * 0.025;
  return <AbsoluteFill style={{background: '#f5efe4', opacity: fade, color: '#203844'}}>
    <svg viewBox="0 0 1920 1080" width="1920" height="1080" aria-label={scene.title}>
      <defs><linearGradient id="wall" x2="0" y2="1"><stop stopColor="#f9f4e9"/><stop offset="1" stopColor="#e5e9df"/></linearGradient><linearGradient id="glass" x2="0" y2="1"><stop stopColor="#bce1e4"/><stop offset="1" stopColor="#e1eee5"/></linearGradient></defs>
      <g transform={`translate(960,500) scale(${zoom}) translate(-960,-500)`}>
        <rect width={1920} height={1080} fill="url(#wall)"/>
        <path d="M0,790H1920V1080H0Z" fill="#d6c8b0"/>
        <path d="M0,790H1920M0,945H1920" stroke="#c4b69e" strokeWidth={3}/>
        <path d="M240,1080L580,790M1600,1080L1380,790" stroke="#b8aa93" strokeWidth={2} opacity={0.35}/>
        <rect x={220} y={210} width={480} height={370} rx={18} fill="#e9dcca"/>
        <rect x={235} y={225} width={450} height={340} rx={8} fill="url(#glass)"/>
        <g opacity={0.3} fill="#79a8ac"><rect x={263} y={390} width={88} height={170}/><rect x={368} y={324} width={98} height={236}/><rect x={496} y={370} width={110} height={190}/></g>
        <path d="M460,225V565M235,390H685" stroke="#f8f3e9" strokeWidth={12}/>
        <path d="M190,582H730" stroke="#bdab8c" strokeWidth={14} strokeLinecap="round"/>
        <path d="M214,202Q165,400 201,586H244V202M688,202Q751,403 714,586H673V202" fill="#e3b6a3"/>
        <ellipse cx={1025} cy={820} rx={470} ry={46} fill="#c3b393" opacity={0.35}/>
        <path d="M1085,671V790M1390,671V790" stroke="#937e63" strokeWidth={17}/>
        <path d="M1060,655H1420V675H1060Z" fill="#b59d7a"/><path d="M1075,675H1405V716H1075Z" fill="#c5b18f"/>
        <rect x={1510} y={250} width={145} height={170} rx={6} fill="#e1c99f"/>
        <rect x={1522} y={262} width={121} height={146} rx={3} fill="#fffaf0"/>
        <circle cx={1582} cy={307} r={25} fill="#e3b99b"/><path d="M1540,387l41,-52 44,52Z" fill="#79a697"/>
        <Prop prop={{id: 'set-plant', kind: 'plant', x: 1550, y: 790, scale: 1.1}}/>
        <Prop prop={{id: 'set-lamp', kind: 'lamp', x: 1370, y: 654, scale: 0.75}}/>
        {state.actors.map((actor) => <Character key={actor.id} actor={actor} frame={frame}/>)}
        {state.props.map((prop) => <Prop key={prop.id} prop={prop}/>)}
      </g>
    </svg>
    <div style={{position: 'absolute', top: 58, left: 100, color: '#587c78', fontSize: 19, letterSpacing: 3, textTransform: 'uppercase'}}>{scene.eyebrow ?? 'Câu chuyện bằng chuyển động'}</div>
    <div style={{position: 'absolute', top: 96, left: 100, fontWeight: 700, fontSize: 44}}>{scene.title}</div>
  </AbsoluteFill>;
}
