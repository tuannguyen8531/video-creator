import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import type {PreparedVideo} from './project';

// A writable snapshot keeps Studio edits separate from the source project and CLI props.
export async function createStudioEntry(video: PreparedVideo, workDir: string) {
  await mkdir(workDir, {recursive: true});
  const component = path.relative(workDir, path.resolve('src/video/Presentation')).split(path.sep).join('/');
  const custom = video.project.scenes.filter((scene) => scene.layout === 'custom');
  const imports = custom.map((scene, i) => {
    const module = path.relative(workDir, scene.component).split(path.sep).join('/');
    return `import Custom${i} from ${JSON.stringify(module.startsWith('.') ? module : `./${module}`)};`;
  }).join('\n');
  const bindings = custom.map((scene, i) => `${JSON.stringify(scene.id)}: Custom${i}`).join(', ');
  const root = `import React from 'react';
import {Composition} from 'remotion';
import {Presentation} from ${JSON.stringify(component.startsWith('.') ? component : `./${component}`)};
${imports}
const SceneRenderer = (props: React.ComponentProps<typeof Presentation>) => <Presentation {...props} customScenes={{${bindings}}}/>;

export const RemotionRoot = () => {
  return <Composition
    id="Presentation"
    component={SceneRenderer}
    width={1920} height={1080} fps={30} durationInFrames={150}
    defaultProps={${JSON.stringify({video}, null, 2)}}
    calculateMetadata={({props}) => ({width: props.video.project.width, height: props.video.project.height, fps: props.video.project.fps, durationInFrames: props.video.durationInFrames})}
  />;
};
`;
  await writeFile(path.join(workDir, 'StudioRoot.tsx'), root);
  // Remotion discovers StudioRoot from the studio-entry naming convention,
  // including API calls that do not carry a symbolicated browser stack.
  const entryPoint = path.join(workDir, 'studio-entry.tsx');
  await writeFile(entryPoint, "import {registerRoot} from 'remotion';\nimport {RemotionRoot} from './StudioRoot';\nregisterRoot(RemotionRoot);\n");
  return entryPoint;
}
