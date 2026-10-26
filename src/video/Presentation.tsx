import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {wrapCaption, type PreparedScene, type PreparedVideo, type Scene} from '../project';
import {CharacterStage} from './CharacterStage';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
function Reveal({children, delay = 0, effect = 'spring', style}: {children: React.ReactNode; delay?: number; effect?: Scene['effect']; style?: React.CSSProperties}) {
  const frame = useCurrentFrame() - delay;
  const {fps} = useVideoConfig();
  const progress = effect === 'spring' ? spring({frame, fps, config: {damping: 22, stiffness: 110}}) : interpolate(frame, [0, 22], [0, 1], clamp);
  return <div style={{opacity: interpolate(frame, [0, 12], [0, 1], clamp), transform: effect === 'fade' ? undefined : effect === 'zoom' ? `scale(${0.94 + progress * 0.06})` : `translateY(${(1 - progress) * 48}px)`, ...style}}>{children}</div>;
}
export type CustomSceneProps = {scene: Extract<Scene, {layout: 'custom'}>; video: PreparedVideo; durationInFrames: number};
export type CustomScenes = Record<string, React.ComponentType<CustomSceneProps>>;

function SceneContent({item, video, index, customScenes}: {item: PreparedScene; video: PreparedVideo; index: number; customScenes: CustomScenes}) {
  const frame = useCurrentFrame();
  if (item.scene.layout === 'custom') {
    const Component = customScenes[item.scene.id];
    if (!Component) throw new Error(`Custom scene ${item.scene.id} needs a generated entry. Use npm run render/dev -- --project <file>.`);
    const cue = video.cues.find((c) => c.sceneId === item.scene.id && frame >= c.startFrame - item.from && frame < c.endFrame - item.from);
    return <AbsoluteFill><Component scene={item.scene} video={video} durationInFrames={item.durationInFrames}/>
      {item.scene.captions && cue && <div style={{position: 'absolute', left: 180, right: 180, bottom: 60, textAlign: 'center', pointerEvents: 'none'}}><div style={{display: 'inline-block', color: '#fff', background: '#020617dc', borderRadius: 16, padding: '16px 30px', fontSize: 30, lineHeight: 1.5, whiteSpace: 'pre-line'}}>{wrapCaption(cue.text)}</div></div>}
    </AbsoluteFill>;
  }
  if (item.scene.layout === 'character') return <CharacterStage item={item} video={video}/>;
  return <SlideContent item={item} video={video} index={index}/>;
}
function SlideContent({item, video, index}: {item: PreparedScene; video: PreparedVideo; index: number}) {
  const frame = useCurrentFrame();
  const {scene, durationInFrames} = item;
  const {project} = video;
  const {theme} = project;
  const {fps} = useVideoConfig();
  const panel: React.CSSProperties = {background: '#ffffff08', border: '1px solid #ffffff18', borderRadius: 28, padding: 40};
  const fade = interpolate(frame, [0, 10, durationInFrames - 10, durationInFrames - 1], [0, 1, 1, 0], clamp);
  const caption = video.cues.find((cue) => cue.sceneId === scene.id && frame >= cue.startFrame - item.from && frame < cue.endFrame - item.from);
  return <AbsoluteFill style={{backgroundColor: theme.background, color: theme.foreground, opacity: fade}}>
    <AbsoluteFill style={{backgroundImage: `radial-gradient(ellipse at 85% 15%, ${theme.accent}18 0%, transparent 55%)`}} />
    <div style={{position: 'absolute', right: -160, top: -270, width: 1000, height: 1000, borderRadius: '50%', border: `1px solid ${theme.accent}22`, transform: `translateY(${Math.sin(frame / 90) * 12}px)`}} />
    <div style={{position: 'absolute', left: 100, right: 100, top: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 21, letterSpacing: 2, color: '#ffffff99'}}>
      <span style={{display: 'flex', alignItems: 'center', gap: 14}}><span style={{width: 13, height: 13, background: theme.accent, borderRadius: 4}} />{project.title}</span>
      <span>{String(index + 1).padStart(2, '0')} / {String(video.scenes.length).padStart(2, '0')}</span>
    </div>
    <div style={{position: 'absolute', top: 150, left: 110, right: 110, bottom: 240, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
      <Reveal effect={scene.effect}><div style={{fontSize: 23, color: theme.accent, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 22}}>{scene.eyebrow ?? 'Video Creator'}</div></Reveal>
      <Reveal delay={5} effect={scene.effect}><h1 style={{fontSize: scene.layout === 'title' || scene.layout === 'outro' ? 88 : 62, fontWeight: 700, lineHeight: 1.18, letterSpacing: -2, margin: '0 0 35px', maxWidth: 1550, overflowWrap: 'anywhere'}}>{scene.title}</h1></Reveal>
      {(scene.layout === 'title' || scene.layout === 'outro') && <Reveal delay={12} effect={scene.effect}><p style={{fontSize: 34, lineHeight: 1.55, color: '#ffffffb8', maxWidth: 1300, margin: 0}}>{scene.subtitle}</p></Reveal>}
      {scene.layout === 'outro' && <Reveal delay={22}><div style={{display: 'inline-block', marginTop: 40, padding: '20px 32px', background: theme.accent, borderRadius: 16, color: theme.background, fontSize: 30, fontWeight: 700}}>{scene.cta} →</div></Reveal>}
      {scene.layout === 'bullets' && <div style={{display: 'grid', gap: 18}}>{scene.bullets.map((bullet, i) => <Reveal key={i} delay={12 + i * 9} effect={scene.effect}><div style={{...panel, padding: '20px 30px', display: 'flex', alignItems: 'center', gap: 25, fontSize: 31}}><span style={{fontSize: 22, color: theme.accent}}>{String(i + 1).padStart(2, '0')}</span>{bullet}</div></Reveal>)}</div>}
      {scene.layout === 'image-and-text' && <div style={{display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 55, alignItems: 'center'}}>
        <Reveal delay={12}><p style={{fontSize: 32, lineHeight: 1.6, margin: 0}}>{scene.body}</p></Reveal>
        <Reveal delay={18} effect="zoom"><Img src={staticFile(scene.image)} style={{width: '100%', height: 360, objectFit: 'contain', ...panel, padding: 10, boxSizing: 'border-box'}} /></Reveal>
      </div>}
      {scene.layout === 'stat' && <Reveal delay={10}><div style={{fontSize: 175, fontWeight: 700, color: theme.accent, lineHeight: 1.2, letterSpacing: -8}}>{Math.round(scene.value * interpolate(frame, [12, 12 + fps * 1.4], [0, 1], clamp)).toLocaleString('vi-VN')}{scene.suffix}</div><p style={{fontSize: 34, color: '#ffffffb8', marginTop: 15}}>{scene.label}</p></Reveal>}
      {scene.layout === 'comparison' && <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30}}>{[scene.left, scene.right].map((col, i) => <Reveal delay={12 + i * 10} key={i}><div style={{...panel, minHeight: 260, borderColor: i ? `${theme.accent}66` : '#ffffff18'}}><h2 style={{fontSize: 34, margin: '0 0 25px', color: i ? theme.accent : theme.foreground}}>{col.title}</h2>{col.items.map((text, j) => <p key={j} style={{fontSize: 28, margin: '12px 0', lineHeight: 1.5}}>• {text}</p>)}</div></Reveal>)}</div>}
    </div>
    {caption && <div style={{position: 'absolute', left: 180, right: 180, bottom: 65, display: 'flex', justifyContent: 'center'}}><div style={{fontSize: 31, lineHeight: 1.5, whiteSpace: 'pre-line', textAlign: 'center', background: '#020617df', borderRadius: 18, padding: '17px 32px', maxWidth: 1450}}>{wrapCaption(caption.text)}</div></div>}
    <div style={{position: 'absolute', left: 0, bottom: 0, height: 4, background: theme.accent, width: `${(item.from + frame + 1) / video.durationInFrames * 100}%`}} />
  </AbsoluteFill>;
}

export function Presentation({video, customScenes = {}}: {video: PreparedVideo; customScenes?: CustomScenes}) {
  return <AbsoluteFill style={{background: video.project.theme.background, fontFamily: video.project.font ? 'VideoProject, VideoNoto, sans-serif' : 'VideoNoto, sans-serif'}}>
    <style>{`@font-face {font-family: VideoNoto; src: url('${staticFile('fonts/NotoSans-Regular.ttf')}'); font-weight: 400;} @font-face {font-family: VideoNoto; src: url('${staticFile('fonts/NotoSans-Bold.ttf')}'); font-weight: 700;}`}</style>
    {video.project.font && <style>{`@font-face {font-family: VideoProject; src: url('${staticFile(video.project.font)}');}`}</style>}
    {video.scenes.map((item, index) => <Sequence key={item.scene.id} from={item.from} durationInFrames={item.durationInFrames}><SceneContent item={item} video={video} index={index} customScenes={customScenes}/></Sequence>)}
    {video.cues.map((cue) => <Sequence key={`${cue.sceneId}/${cue.segmentId}`} from={cue.startFrame} durationInFrames={cue.endFrame - cue.startFrame}><Audio src={staticFile(cue.audio)} /></Sequence>)}
  </AbsoluteFill>;
}
