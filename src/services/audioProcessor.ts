/**
 * MediaForge - Real Client-Side Audio Processing Engine
 * Powered by Web Audio API & OfflineAudioContext - 100% in-browser, privacy-first
 */

import { ffmpegService } from './ffmpegService';

export interface AudioConversionOptions {
  format: 'wav' | 'mp3' | 'aac' | 'ogg' | 'opus' | 'flac' | 'm4a';
  bitrate?: number; // e.g. 128, 192, 320 kbps
  sampleRate?: number; // e.g. 44100, 48000
  channels?: 1 | 2; // mono or stereo
  volume?: number; // 0.1 to 2.0
  normalize?: boolean;
}

let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume();
  }
  return sharedAudioContext;
}

/**
 * Decode file into an AudioBuffer
 */
export async function decodeAudioFile(file: File | Blob): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer);
}

/**
 * Encode AudioBuffer to valid 16-bit PCM WAV blob
 */
export function audioBufferToWav(buffer: AudioBuffer, targetSampleRate?: number, channelsCount?: 1 | 2, volume: number = 1.0): Blob {
  const numChannels = channelsCount || Math.min(2, buffer.numberOfChannels);
  const sampleRate = targetSampleRate || buffer.sampleRate;
  const length = Math.max(1, Math.round(buffer.length * sampleRate / buffer.sampleRate));

  // Interleave and scale channels
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c % buffer.numberOfChannels));
  }

  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wavBuffer);

  // RIFF identifier 'RIFF'
  writeString(view, 0, 'RIFF');
  // file length minus 8
  view.setUint32(4, 36 + dataSize, true);
  // 'WAVE'
  writeString(view, 8, 'WAVE');
  // 'fmt ' chunk
  writeString(view, 12, 'fmt ');
  // Subchunk1Size is 16 for PCM
  view.setUint32(16, 16, true);
  // AudioFormat 1 = PCM
  view.setUint16(20, 1, true);
  // Number of channels
  view.setUint16(22, numChannels, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate
  view.setUint32(28, byteRate, true);
  // Block align
  view.setUint16(32, blockAlign, true);
  // Bits per sample
  view.setUint16(34, 16, true);
  // 'data' chunk header
  writeString(view, 36, 'data');
  // data size
  view.setUint32(40, dataSize, true);

  // Write PCM audio data
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sourcePosition = i * buffer.sampleRate / sampleRate;
      const left = Math.min(buffer.length - 1, Math.floor(sourcePosition));
      const right = Math.min(buffer.length - 1, left + 1);
      const fraction = sourcePosition - left;
      const channelSample = (data: Float32Array) => data[left] * (1 - fraction) + data[right] * fraction;
      let sample = channelSample(channels[c]);
      if (numChannels === 1 && buffer.numberOfChannels > 1) {
        sample = 0;
        for (let ch = 0; ch < buffer.numberOfChannels; ch++) sample += channelSample(buffer.getChannelData(ch));
        sample /= buffer.numberOfChannels;
      }
      sample *= volume;
      // Clamp between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit signed integer (-32768 to 32767)
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Convert audio using AudioBuffer + MediaRecorder (for WebM/Opus/OGG) or WAV encoder
 */
export async function convertAudio(
  file: File | Blob,
  options: AudioConversionOptions,
  onProgress?: (percent: number) => void
): Promise<{ blob: Blob; duration: number; originalSize: number; newSize: number; format: string }> {
  if (options.normalize || (options.volume !== undefined && options.volume !== 1)) {
    const decoded = await decodeAudioFile(file);
    let gain = options.volume ?? 1;
    if (options.normalize) {
      let peak = 0;
      for (let c = 0; c < decoded.numberOfChannels; c++) {
        for (const sample of decoded.getChannelData(c)) peak = Math.max(peak, Math.abs(sample));
      }
      if (peak > 0) gain /= peak;
    }
    const pcm = audioBufferToWav(decoded, options.sampleRate, options.channels, gain);
    if (options.format === 'wav') {
      onProgress?.(100);
      return { blob: pcm, duration: decoded.duration, originalSize: file.size, newSize: pcm.size, format: 'wav' };
    }
    const result = await convertAudio(new File([pcm], 'processed.wav', { type: 'audio/wav' }), { ...options, normalize: false, volume: 1 }, onProgress);
    return { ...result, originalSize: file.size };
  }
  // If file is a File object, attempt FFmpeg.wasm first
  if (file instanceof File) {
    try {
      const ffmpegBlob = await ffmpegService.convertAudioWithFFmpeg(
        file,
        options.format,
        {
          bitrate: options.bitrate,
          sampleRate: options.sampleRate,
          channels: options.channels,
        },
        onProgress
      );

      return {
        blob: ffmpegBlob,
        duration: 0,
        originalSize: file.size,
        newSize: ffmpegBlob.size,
        format: options.format,
      };
    } catch (ffmpegErr) {
      console.log('Falling back to WebAudio WAV/MediaRecorder pipeline:', ffmpegErr);
    }
  }

  onProgress?.(10);
  const audioBuffer = await decodeAudioFile(file);
  onProgress?.(45);

  const duration = audioBuffer.duration;
  let resultBlob: Blob;

  if (options.format === 'wav') {
    resultBlob = audioBufferToWav(audioBuffer, options.sampleRate, options.channels, options.volume ?? 1);
  } else {
    const mimeCandidates: Record<string, string[]> = {
      ogg: ['audio/ogg;codecs=opus', 'audio/ogg'],
      opus: ['audio/ogg;codecs=opus'],
      m4a: ['audio/mp4'],
    };
    const selectedMime = typeof MediaRecorder !== 'undefined'
      ? (mimeCandidates[options.format] || []).find((mime) => MediaRecorder.isTypeSupported(mime))
      : undefined;
    if (!selectedMime) {
      throw new Error(`${options.format.toUpperCase()} encoding requires the FFmpeg engine, which could not load. Check your connection or choose WAV.`);
    }
    let recordingBuffer = audioBuffer;
    if (options.sampleRate || options.channels) {
      const rate = options.sampleRate || audioBuffer.sampleRate;
      const offline = new OfflineAudioContext(options.channels || audioBuffer.numberOfChannels, Math.ceil(duration * rate), rate);
      const source = offline.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offline.destination);
      source.start();
      recordingBuffer = await offline.startRendering();
    }
    resultBlob = await encodeAudioViaMediaRecorder(recordingBuffer, selectedMime, options.bitrate || 192, options.volume ?? 1, onProgress);
  }
  onProgress?.(100);

  return {
    blob: resultBlob,
    duration,
    originalSize: file.size,
    newSize: resultBlob.size,
    format: options.format,
  };
}

/**
 * Audio Cutter: Slice audio between startTime and endTime
 */
export async function cutAudio(
  file: File | Blob,
  startTime: number,
  endTime: number,
  volume: number = 1.0
): Promise<{ blob: Blob; duration: number }> {
  const originalBuffer = await decodeAudioFile(file);
  const sampleRate = originalBuffer.sampleRate;
  const channels = originalBuffer.numberOfChannels;

  const startSample = Math.max(0, Math.floor(startTime * sampleRate));
  const endSample = Math.min(originalBuffer.length, Math.floor(endTime * sampleRate));
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endSample <= startSample || startSample >= originalBuffer.length) throw new Error('Choose an end time after the start time and within the audio duration.');
  const newLength = endSample - startSample;

  const ctx = getAudioContext();
  const trimmedBuffer = ctx.createBuffer(channels, newLength, sampleRate);

  for (let c = 0; c < channels; c++) {
    const origData = originalBuffer.getChannelData(c);
    const trimmedData = trimmedBuffer.getChannelData(c);
    for (let i = 0; i < newLength; i++) {
      trimmedData[i] = origData[startSample + i];
    }
  }

  const blob = audioBufferToWav(trimmedBuffer, sampleRate, channels === 1 ? 1 : 2, volume);
  return {
    blob,
    duration: trimmedBuffer.duration,
  };
}

/**
 * Audio Merger: Combine multiple audio files in sequence
 */
export async function mergeAudioFiles(files: File[]): Promise<{ blob: Blob; duration: number }> {
  if (files.length === 0) throw new Error('No files to merge');
  const buffers: AudioBuffer[] = [];

  for (const file of files) {
    const buf = await decodeAudioFile(file);
    buffers.push(buf);
  }

  const sampleRate = buffers[0].sampleRate;
  const numChannels = Math.max(...buffers.map((b) => b.numberOfChannels));
  const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);

  const ctx = getAudioContext();
  const mergedBuffer = ctx.createBuffer(numChannels, totalLength, sampleRate);

  let currentOffset = 0;
  for (const buf of buffers) {
    for (let c = 0; c < numChannels; c++) {
      const srcChannel = buf.getChannelData(c % buf.numberOfChannels);
      const destChannel = mergedBuffer.getChannelData(c);
      destChannel.set(srcChannel, currentOffset);
    }
    currentOffset += buf.length;
  }

  const blob = audioBufferToWav(mergedBuffer, sampleRate, numChannels >= 2 ? 2 : 1);
  return {
    blob,
    duration: mergedBuffer.duration,
  };
}

/**
 * Real Audio-to-Video Engine:
 * Combines audio file + background image/artwork into an MP4/WebM video with visualizer!
 */
export async function audioToVideo(
  audioFile: File,
  imageFile?: File,
  fps: number = 30,
  onProgress?: (percent: number) => void
): Promise<{ blob: Blob; duration: number }> {
  const audioBuffer = await decodeAudioFile(audioFile);
  const duration = audioBuffer.duration;

  // Create canvas for video background
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;

  let bgImg: HTMLImageElement | null = null;
  if (imageFile) {
    bgImg = new Image();
    bgImg.src = URL.createObjectURL(imageFile);
    await new Promise((r) => (bgImg!.onload = r));
  }

  // Draw background frame
  function drawFrame(analyserData?: Uint8Array) {
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
      // Dark overlay for readability and waveform contrast
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      // Modern gradient background
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Title text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(audioFile.name.replace(/\.[^/.]+$/, ''), canvas.width / 2, canvas.height / 2 - 40);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('MediaForge Audio Visualizer', canvas.width / 2, canvas.height / 2 + 10);

    // Waveform visualizer bar
    if (analyserData) {
      const barWidth = 6;
      const barGap = 3;
      const totalBars = 64;
      const startX = (canvas.width - totalBars * (barWidth + barGap)) / 2;
      const centerY = canvas.height * 0.75;

      for (let i = 0; i < totalBars; i++) {
        const val = analyserData[i] || 10;
        const barHeight = Math.max(4, (val / 255) * 120);
        ctx.fillStyle = `hsl(${220 + (i / totalBars) * 60}, 85%, 65%)`;
        ctx.fillRect(startX + i * (barWidth + barGap), centerY - barHeight / 2, barWidth, barHeight);
      }
    }
  }

  drawFrame();

  // Setup audio node graph and canvas stream
  const actx = getAudioContext();
  const source = actx.createBufferSource();
  source.buffer = audioBuffer;

  const dest = actx.createMediaStreamDestination();
  const analyser = actx.createAnalyser();
  analyser.fftSize = 128;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  source.connect(analyser);
  analyser.connect(dest);

  const canvasStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const mime = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
  const recorder = new MediaRecorder(combinedStream, {
    mimeType: mime,
    videoBitsPerSecond: 2500000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    let animId: number;
    let startTime = Date.now();

    recorder.onstop = () => {
      cancelAnimationFrame(animId);
      source.stop();
      resolve({
        blob: new Blob(chunks, { type: mime }),
        duration,
      });
    };

    recorder.onerror = (e) => {
      cancelAnimationFrame(animId);
      reject(e);
    };

    recorder.start(100);
    source.start();

    function renderLoop() {
      analyser.getByteFrequencyData(dataArray);
      drawFrame(dataArray);

      const elapsed = (Date.now() - startTime) / 1000;
      if (onProgress) {
        onProgress(Math.min(99, Math.round((elapsed / duration) * 100)));
      }

      if (elapsed >= duration) {
        recorder.stop();
      } else {
        animId = requestAnimationFrame(renderLoop);
      }
    }

    renderLoop();
  });
}

async function encodeAudioViaMediaRecorder(
  buffer: AudioBuffer,
  mimeType: string,
  bitrate: number,
  volume: number,
  onProgress?: (p: number) => void
): Promise<Blob> {
  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(gain);

  const dest = ctx.createMediaStreamDestination();
  gain.connect(dest);

  const recorder = new MediaRecorder(dest.stream, {
    mimeType,
    audioBitsPerSecond: bitrate * 1000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      source.disconnect();
      gain.disconnect();
      dest.stream.getTracks().forEach((track) => track.stop());
    };
    recorder.onstop = () => {
      cleanup();
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.onerror = (error) => {
      cleanup();
      reject(error);
    };
    source.onended = () => {
      if (recorder.state !== 'inactive') recorder.stop();
    };
    recorder.start(250);
    source.start();
  });
}
