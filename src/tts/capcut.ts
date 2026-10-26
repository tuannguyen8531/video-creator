// Copyright 2026 Hacht. Licensed under Apache-2.0.
// Modified: TypeScript port; single-segment results, bounded retries and cancellation.
import {constants, createHash, publicEncrypt, randomBytes, randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import type {Project, Segment} from '../project';

export const BASE_URL = 'https://editor-api-sg.capcutapi.com';
export const REQUEST_VERSION = 'capcut-single-v2-language';
type Voice = {voice_type: string; display_name: string; resource_id: string; lan: string; lang?: string};
export const voices: Voice[] = JSON.parse(readFileSync(new URL('../../assets/capcut/voices.json', import.meta.url), 'utf8'))
  .filter((v: Voice) => v.voice_type && v.resource_id && !/neural/i.test(v.voice_type));
const publicKey = readFileSync(new URL('./capcut-public.pem', import.meta.url), 'utf8');
export const md5 = (text: string) => createHash('md5').update(text).digest('hex');
export const escapeXml = (text: string) => text.replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[c]!));
export const headerSign = (url: string, version: string, time: string, tdid: string) =>
  md5(`9e2c|${url.split('?')[0].slice(-7)}|3|${version}|${time}|${tdid}|11ac`);
export function resolveVoice(id: string): Voice {
  const clean = id.replace(/^capcut:/i, '').toLowerCase();
  const voice = voices.find((v) => v.voice_type.toLowerCase() === clean);
  if (!voice) throw new Error(`Unknown CapCut voice: ${id}. Run npm run voices.`);
  return voice;
}

export function speechSettings(segment: Segment, project: Project) {
  const id = segment.voice ?? project.voice;
  if (!id) throw new Error('Choose a voice for this segment or project');
  const voice = resolveVoice(id);
  const language = new Intl.Locale(segment.language ?? project.language ?? voice.lang ?? voice.lan).toString();
  if (new Intl.Locale(language).language !== new Intl.Locale(voice.lang ?? voice.lan).language) throw new Error(`Voice ${voice.voice_type} is cataloged for ${voice.lang ?? voice.lan}, not ${language}; select a matching voice`);
  return {voice: `capcut:${voice.voice_type}`, language, speed: segment.speed ?? project.speed};
}

export function makeSsml(text: string, voice: Voice, speed: number, language = voice.lang ?? voice.lan) {
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${escapeXml(language)}">\n` +
    `<voice name="${escapeXml(voice.voice_type)}" mock_tone_info="" platform="sami" resource_id="${escapeXml(voice.resource_id)}" emotion="" emotion_scale="0" style="" role="" moyin_emotion="" is_clone_tone="false" need_subtitle_timestamp="false">\n` +
    `<prosody rate="${speed.toFixed(2)}">${escapeXml(text.trim())}</prosody>\n</voice>\n</speak>`;
}

type Options = {
  language?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  requestTimeoutMs?: number;
  pollMs?: number;
  fetch?: typeof fetch;
};

export async function synthesize(text: string, voiceId: string, speed = 1, options: Options = {}): Promise<Buffer> {
  if (!text.trim()) throw new Error('TTS text is empty');
  if (!Number.isFinite(speed) || speed < 0.5 || speed > 2) throw new Error('TTS speed must be 0.5–2');
  const voice = resolveVoice(voiceId);
  const language = new Intl.Locale(options.language ?? voice.lang ?? voice.lan).toString();
  if (new Intl.Locale(language).language !== new Intl.Locale(voice.lang ?? voice.lan).language) throw new Error('Voice and language do not match the local catalog');
  const deadline = AbortSignal.timeout(options.timeoutMs ?? 120_000);
  const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
  signal.throwIfAborted();
  const http = options.fetch ?? fetch;
  const numberId = () => (BigInt('0x' + randomBytes(9).toString('hex')) % (10n ** 20n)).toString().padStart(20, '0');
  const d = {
    aid: '359289', app_name: 'CapCut', appvr: '8.7.0', version_name: '8.7.0', version_code: '8.7.0',
    channel: 'capcutpc_google', device_platform: 'mac', device_type: 'MacBookPro17,4', device_brand: 'MacBookPro17,4',
    os_version: '15.7.4', device_id: numberId(), iid: numberId(), tdid: numberId(), region: 'VN', loc: 'VN', lan: language, pf: '3',
  };
  const babi = {feature_entrance: 'editor', feature_entrance_detail: 'editor-feature-text_to_speech', feature_key: 'text_to_speech', scenario: 'video_editor'};
  const query = (create: boolean) => {
    const q = Object.fromEntries(['app_name', 'device_type', 'os_version', 'channel', 'version_name', 'device_brand', 'device_id', 'iid', 'version_code', 'device_platform', 'aid'].map((k) => [k, d[k as keyof typeof d]]));
    if (create) Object.assign(q, {region: d.region, babi_param: JSON.stringify(babi)});
    return new URLSearchParams(q).toString();
  };
  // Creating a task is not retried: an ambiguous response may already have created it.
  const request = async (url: string, body?: object, retry = false): Promise<Response> => {
    for (let attempt = 0; ; attempt++) {
      signal.throwIfAborted();
      const bodyText = body ? JSON.stringify(body) : undefined;
      const now = Math.floor(Date.now() / 1000).toString();
      const trace = randomUUID().replaceAll('-', '');
      const headers = body ? {
        'content-type': 'application/json', appvr: d.appvr, ch: d.channel, 'device-time': now, lan: d.lan, loc: d.loc,
        pf: d.pf, 'sign-ver': '1', tdid: d.tdid, 'x-ss-stub': md5(bodyText!), 'x-ss-dp': d.aid,
        'x-khronos': now, 'x-tt-trace-id': `00-${trace}-${trace.slice(0, 16)}-01`,
        'user-agent': 'Cronet/TTNetVersion:1d7cc3b1 2025-07-16 QuicVersion:52c2b40d 2025-04-03',
        'app-sdk-version': d.appvr, appid: d.aid, sign: headerSign(url, d.appvr, now, d.tdid),
      } : undefined;
      let response: Response;
      try {
        response = await http(url, {method: body ? 'POST' : 'GET', body: bodyText, headers,
          signal: AbortSignal.any([signal, AbortSignal.timeout(options.requestTimeoutMs ?? 30_000)])});
      } catch (error) {
        if (!retry || attempt >= 2 || signal.aborted) throw error;
        await delay(500 * 2 ** attempt, undefined, {signal});
        continue;
      }
      if (response.ok) return response;
      await response.body?.cancel();
      if (!retry || attempt >= 2 || (response.status !== 429 && response.status < 500)) {
        throw new Error(`CapCut ${body ? 'API' : 'audio'} HTTP ${response.status}`);
      }
      await delay(500 * 2 ** attempt, undefined, {signal});
    }
  };
  const json = async (url: string, body: object, retry = false) => {
    const response = await request(url, body, retry);
    const data = await response.json() as Record<string, any>;
    if (data.ret !== undefined && data.ret !== null && String(data.ret) !== '0') {
      throw new Error(`CapCut ret=${data.ret}: ${String(data.errmsg ?? 'request rejected').slice(0, 200)}`);
    }
    return data;
  };
  const ssml = makeSsml(text, voice, speed, language);
  const extraInfo = JSON.stringify({benefit_info: {}});
  const signText = `appid:${d.aid}&did:${d.device_id}&creditDisable:false&ssml:${md5(ssml)}&extraInfo:${extraInfo}`;
  const sign = publicEncrypt({key: publicKey, padding: constants.RSA_PKCS1_PADDING}, Buffer.from(signText)).toString('base64');
  const payload = {audio_format: 'mp3', babi_param: JSON.stringify(babi), credit_disable: false,
    extra_info: extraInfo, need_merge_voice: false, need_subtitle_timestamp: false, scene: 'text_to_speech', ssml, sign};
  const created = await json(`${BASE_URL}/lv/v1/common_task/new?${query(true)}`, {
    bind_id: randomUUID(), can_queue: true, enter_from: 'text_to_speech',
    tasks: [{context: randomUUID(), payload: JSON.stringify(payload), req_key: 'sami_text_to_speech', task_version: 'v3'}],
  });
  const task = created.data?.tasks?.[0];
  if (!task?.id || !task?.token) throw new Error('CapCut create response missing task ID/token');
  while (true) {
    const result = await json(`${BASE_URL}/lv/v1/common_task/query?${query(false)}`, {
      tasks: [{bind_id: '', id: task.id, req_key: 'sami_text_to_speech', task_version: 'v3', token: task.token}],
    }, true);
    const current = result.data?.tasks?.[0];
    const status = String(current?.status ?? '').toLowerCase();
    if (['failed', 'fail', 'error'].includes(status)) throw new Error(`CapCut task failed (${current.err_code ?? status}): ${String(current.err_msg ?? current.detail_info ?? status).slice(0, 200)}`);
    if (['succeed', 'success'].includes(status)) {
      const data = typeof current.payload === 'string' ? JSON.parse(current.payload) : current.payload;
      const results = data?.audio_subtitles;
      if (!Array.isArray(results) || results.length !== 1 || !results[0]?.speech_url) throw new Error('CapCut response must contain exactly one audio URL');
      const url = new URL(results[0].speech_url);
      if (url.protocol !== 'https:') throw new Error('CapCut returned a non-HTTPS audio URL');
      const response = await request(url.href, undefined, true);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length) throw new Error('CapCut returned empty audio');
      return bytes;
    }
    await delay(options.pollMs ?? 1000, undefined, {signal});
  }
}
