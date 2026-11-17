import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import {resolveProjectFile} from '../src/paths';
import {synthesize, voices} from '../src/tts/capcut';

const exec = promisify(execFile);
const hash = (v: string) => createHash('sha256').update(v).digest('hex');

const cacheDir = path.resolve('.cache/tts');
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, {recursive: true});

async function getChunkAudio(text: string, voice: string, language = 'vi-VN'): Promise<Buffer> {
  const clean = text.trim();
  const key = hash(JSON.stringify({text: clean, voice, speed: 1, lang: language}));
  const cachedFile = path.join(cacheDir, `${key}.mp3`);
  if (fs.existsSync(cachedFile)) {
    return fs.readFileSync(cachedFile);
  }
  const buf = await synthesize(clean, voice, 1, {language});
  fs.writeFileSync(cachedFile, buf);
  return buf;
}

function chunkText(text: string, maxLen = 210): string[] {
  const clean = text
    .replace(/[•\-\*]/g, ' ')
    .replace(/["'“”‘’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Split by sentence punctuation (. ! ? : or newline)
  const sentences = clean.match(/[^.!?:\n]+[.!?:\n]+|[^.!?:\n]+$/g) || [clean];
  const chunks: string[] = [];
  let cur = '';

  for (const s of sentences) {
    const sTrim = s.trim();
    if (!sTrim) continue;
    if ((cur + ' ' + sTrim).trim().length <= maxLen) {
      cur = (cur + ' ' + sTrim).trim();
    } else {
      if (cur) chunks.push(cur);
      if (sTrim.length > maxLen) {
        // If an individual sentence is longer than maxLen, split by clauses
        const clauses = sTrim.split(/[,;]/);
        let cCur = '';
        for (const c of clauses) {
          const cTrim = c.trim();
          if (!cTrim) continue;
          if ((cCur + ', ' + cTrim).trim().length <= maxLen) {
            cCur = (cCur ? cCur + ', ' + cTrim : cTrim);
          } else {
            if (cCur) chunks.push(cCur);
            cCur = cTrim;
          }
        }
        if (cCur) cur = cCur; else cur = '';
      } else {
        cur = sTrim;
      }
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

async function main() {
  const {values} = parseArgs({
    allowPositionals: true,
    options: {
      project: {type: 'string'},
      voice: {type: 'string'},
      language: {type: 'string'},
      rate: {type: 'string', default: '1.2'},
      html: {type: 'string', default: 'slides.html'},
      concurrency: {type: 'string', default: '3'},
    },
  });

  // 1. Resolve project dynamically using project path resolver
  const projectFile = await resolveProjectFile(values.project);
  const inputDir = path.dirname(projectFile);
  const projectJson = JSON.parse(fs.readFileSync(projectFile, 'utf8'));

  // 2. Resolve voice, language, and tempo rate
  const voice = values.voice || projectJson.voice || 'capcut:vi_female_huong';
  const language = values.language || projectJson.language || 'vi-VN';
  const rate = parseFloat(values.rate || '1.2') || 1.2;
  const concurrency = Math.max(1, Math.min(6, parseInt(values.concurrency || '3', 10)));

  console.log(`[Deck Audio] Project file : ${projectFile}`);
  console.log(`[Deck Audio] Voice        : ${voice}`);
  console.log(`[Deck Audio] Language     : ${language}`);
  console.log(`[Deck Audio] Tempo rate   : ${rate}x`);

  // 3. Extract slide texts from HTML deck or fallback to project.json scenes
  const htmlPath = path.resolve(inputDir, values.html || 'slides.html');
  const slideTexts: {title?: string; text: string}[] = [];

  if (fs.existsSync(htmlPath)) {
    console.log(`[Deck Audio] Reading notes from: ${htmlPath}`);
    const html = fs.readFileSync(htmlPath, 'utf8');
    const regex = /data-notes=\"([^\"]+)\"/g;
    let match: RegExpExecArray | null;
    let i = 1;
    while ((match = regex.exec(html)) !== null) {
      slideTexts.push({title: `Slide ${String(i).padStart(2, '0')}`, text: match[1]});
      i++;
    }
  } else {
    console.log(`[Deck Audio] HTML not found, extracting narration from project scenes: ${projectFile}`);
    projectJson.scenes?.forEach((s: any, idx: number) => {
      const sceneText = s.narration?.map((n: any) => n.text).join(' ') || s.body || '';
      if (sceneText) {
        slideTexts.push({title: s.id || `Slide ${String(idx + 1).padStart(2, '0')}`, text: sceneText});
      }
    });
  }

  if (!slideTexts.length) {
    throw new Error(`No slide notes or narration found in ${htmlPath} or ${projectFile}`);
  }

  console.log(`[Deck Audio] Found ${slideTexts.length} slides to process.`);

  // 4. Output directory inside input/assets/audio
  const audioDir = path.resolve(inputDir, 'assets/audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, {recursive: true});

  for (let sIdx = 0; sIdx < slideTexts.length; sIdx++) {
    const slideNum = String(sIdx + 1).padStart(2, '0');
    const outFile = path.join(audioDir, `slide-${slideNum}.mp3`);
    const rawText = slideTexts[sIdx].text;
    const chunks = chunkText(rawText, 210);

    console.log(`\n[Slide ${slideNum}] Generating ${chunks.length} chunks...`);

    const tmpDir = path.join(audioDir, `_tmp_${slideNum}`);
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, {recursive: true});

    try {
      const results: Buffer[] = new Array(chunks.length);

      for (let i = 0; i < chunks.length; i += concurrency) {
        const batch = chunks.slice(i, i + concurrency);
        const batchResults = await Promise.all(
          batch.map((chunk, bIdx) => {
            const idxStr = `${i + bIdx + 1}/${chunks.length}`;
            console.log(`  -> Synthesizing chunk ${idxStr} (${chunk.length} chars)`);
            return getChunkAudio(chunk, voice, language);
          })
        );
        batchResults.forEach((buf, bIdx) => {
          results[i + bIdx] = buf;
        });
      }

      const tmpFiles: string[] = [];
      for (let i = 0; i < results.length; i++) {
        const f = path.join(tmpDir, `part_${String(i).padStart(3, '0')}.mp3`);
        fs.writeFileSync(f, results[i]);
        tmpFiles.push(f);
      }

      // Concat chunks with ffmpeg and apply tempo rate
      const listFile = path.join(tmpDir, 'concat.txt');
      fs.writeFileSync(listFile, tmpFiles.map(f => `file '${f}'`).join('\n'));

      const intermediate = path.join(tmpDir, 'combined.mp3');
      await exec('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', intermediate]);

      if (Math.abs(rate - 1.0) > 0.01) {
        await exec('ffmpeg', ['-y', '-i', intermediate, '-filter:a', `atempo=${rate}`, '-c:a', 'libmp3lame', '-b:a', '128k', outFile]);
      } else {
        fs.copyFileSync(intermediate, outFile);
      }

      const stat = fs.statSync(outFile);
      console.log(`[Slide ${slideNum}] Complete -> ${outFile} (${Math.round(stat.size / 1024)} KB)`);
    } finally {
      fs.rmSync(tmpDir, {recursive: true, force: true});
    }
  }

  console.log(`\n[Deck Audio] All ${slideTexts.length} audio files successfully generated in ${audioDir}!`);
}

main().catch(err => {
  console.error('\n[Deck Audio Error]:', err.message || err);
  process.exit(1);
});
