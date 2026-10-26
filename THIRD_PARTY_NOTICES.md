# Third-party notices

The client has been rewritten in TypeScript, uses Node.js cryptography and fetch, and changes timeout, retry, validation, cache and error behavior. No Python runtime is included.

`public/fonts/NotoSans-Regular.ttf` and `NotoSans-Bold.ttf` are Noto fonts distributed under the SIL Open Font License 1.1. Copyright and license notices from the installed Debian package are included in `licenses/Noto-fonts.txt`.

Character lip-sync analysis uses Rhubarb Lip Sync 1.14.0, downloaded from the official DanielSWolf/rhubarb-lip-sync GitHub releases by `npm run setup:lipsync`. Its executable, models, and bundled license notices stay together in the ignored `.cache/tools/` directory; they are not vendored into this repository. See https://github.com/DanielSWolf/rhubarb-lip-sync for its license and included third-party components.

The vector character rig and room/prop illustrations in `src/video/CharacterStage.tsx` are authored for this project; no external character artwork is included.
