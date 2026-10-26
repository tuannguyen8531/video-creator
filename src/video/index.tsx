import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Presentation} from './Presentation';
import {projectSchema, type PreparedVideo} from '../project';

const project = projectSchema.parse({id: 'welcome', title: 'Video Creator', language: 'en-US', voice: 'capcut:en_us_006', scenes: [{id: 'welcome', layout: 'title', title: 'Choose a project to preview', subtitle: 'npm run dev -- --project <file>', narration: [{id: 'welcome', text: 'Video Creator'}]}]});
const video: PreparedVideo = {project, scenes: [{scene: project.scenes[0], from: 0, durationInFrames: 150}], cues: [], durationInFrames: 150};
const Root = () => <Composition id="Presentation" component={Presentation} defaultProps={{video}} width={1920} height={1080} fps={30} durationInFrames={150}
  calculateMetadata={({props}) => ({width: props.video.project.width, height: props.video.project.height, fps: props.video.project.fps, durationInFrames: props.video.durationInFrames})} />;
registerRoot(Root);
