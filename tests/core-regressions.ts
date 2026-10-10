import assert from 'node:assert/strict';
import { audioBufferToWav, convertAudio } from '../src/services/audioProcessor';
import { convertImage } from '../src/services/imageProcessor';
import { ffmpegService } from '../src/services/ffmpegService';

const sampleRate = 48000;
const channel = new Float32Array(sampleRate).fill(0.5);
const buffer = { sampleRate, length: sampleRate, numberOfChannels: 2, getChannelData: () => channel } as unknown as AudioBuffer;
const wav = await audioBufferToWav(buffer, 24000, 1).arrayBuffer();
const header = new DataView(wav);
assert.equal(header.getUint32(24, true), 24000);
assert.equal(header.getUint32(40, true), 24000 * 2, 'One second must stay one second after resampling');
assert.equal(header.getInt16(44, true), 16383);
assert.equal(new TextDecoder().decode(wav.slice(0, 4)), 'RIFF');

// Browsers silently return PNG when an unsupported Canvas encoder is requested.
(globalThis as any).Image = class {
  naturalWidth = 64; naturalHeight = 64;
  onload: () => void;
  set src(value: string) { queueMicrotask(() => this.onload()); }
};
(globalThis as any).document = {
  createElement: () => ({
    width: 0, height: 0,
    getContext: () => ({ fillRect() {}, save() {}, translate() {}, rotate() {}, scale() {}, drawImage() {}, restore() {} }),
    toBlob: (callback: (blob: Blob) => void) => callback(new Blob(['png'], { type: 'image/png' })),
  }),
};
await assert.rejects(convertImage(new Blob(['source']), { format: 'avif' }), /cannot encode AVIF/);
assert.equal((await convertImage(new Blob(['source']), { format: 'png' })).blob.type, 'image/png');

// Verify the worker lock and cleanup on failure using a worker double.
let active = 0;
let maxActive = 0;
const deleted: string[] = [];
let exitCode = 0;
(globalThis as any).FileReader = class {
  result: ArrayBuffer;
  onload: () => void;
  onloadend: () => void;
  async readAsArrayBuffer(blob: Blob) {
    this.result = await blob.arrayBuffer();
    this.onload?.(); this.onloadend?.();
  }
};
Object.assign(ffmpegService as any, {
  status: 'ready',
  ffmpeg: {
    on() {}, off() {}, async writeFile() {},
    async exec() {
      active++; maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active--; return exitCode;
    },
    async readFile() { return new Uint8Array([1, 2, 3]); },
    async deleteFile(name: string) { deleted.push(name); },
  },
});
const input = new File(['source'], 'source.wav', { type: 'audio/wav' });
await Promise.all([
  ffmpegService.convertAudioWithFFmpeg(input, 'wav'),
  ffmpegService.convertVideoWithFFmpeg(input, 'mp4'),
]);
assert.equal(maxActive, 1, 'Audio and video must not overlap on the same FFmpeg worker');
exitCode = 1;
const deletedBeforeFailure = deleted.length;
await assert.rejects(ffmpegService.convertAudioWithFFmpeg(input, 'mp3'), /Conversion failed/);
assert.ok(deleted.length >= deletedBeforeFailure + 2, 'Failed jobs must clean up both virtual files');
// A missing native encoder must produce an actionable error, never a renamed WAV file.
(globalThis as any).window = { AudioContext: class {
  state = 'running';
  async decodeAudioData() { return { ...buffer, duration: 1 }; }
} };
(globalThis as any).MediaRecorder = undefined;
await assert.rejects(convertAudio(new Blob(['source']), { format: 'mp3' }), /requires the FFmpeg engine/);
const nativeWav = await convertAudio(new Blob(['source']), { format: 'wav', sampleRate: 24000 });
assert.equal(nativeWav.blob.type, 'audio/wav');
assert.equal(new DataView(await nativeWav.blob.arrayBuffer()).getUint32(40, true), 24000 * 4);
console.log('PASS: WAV duration/header, image output MIME, FFmpeg serialization, failure cleanup, honest audio fallback');
