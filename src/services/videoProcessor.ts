/**
 * MediaForge - Real Client-Side Video Processing Engine
 * Powered by HTML5 Video, Canvas, Web Audio API & MediaRecorder - 100% in-browser, privacy-first
 */

import JSZip from 'jszip';
import { audioBufferToWav } from './audioProcessor';
import { ffmpegService } from './ffmpegService';

export interface VideoConversionOptions {
  format?: 'mp4' | 'webm' | 'mkv' | 'mov' | 'gif' | 'avi';
  resolution?: { width: number; height: number };
  bitrate?: number; // bps e.g. 1500000
  fps?: number;
  removeAudio?: boolean;
  crop?: { x: number; y: number; width: number; height: number };
  startTime?: number;
  endTime?: number;
}

/**
 * Loads a video file into an HTMLVideoElement and retrieves metadata
 */
export async function loadVideoElement(file: File | Blob): Promise<{ video: HTMLVideoElement; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.muted = false;

    video.onloadedmetadata = () => {
      resolve({
        video,
        cleanup: () => {
          video.pause();
          video.removeAttribute('src');
          video.load();
          URL.revokeObjectURL(url);
        },
      });
    };

    video.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video file: unsupported container or corrupted data.'));
    };
  });
}

/**
 * Extract frames from video at specific interval or timestamps
 * Returns an array of blob frames and supports bundling into a ZIP!
 */
export async function extractVideoFrames(
  file: File,
  intervalSeconds: number = 1,
  format: 'jpeg' | 'png' | 'webp' = 'jpeg',
  maxFrames: number = 60,
  onProgress?: (progress: number) => void
): Promise<{ frames: { blob: Blob; timestamp: number; url: string }[]; zipBlob?: Blob }> {
  const { video, cleanup } = await loadVideoElement(file);
  const duration = video.duration || 1;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d')!;

  const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
  const frames: { blob: Blob; timestamp: number; url: string }[] = [];

  const timestamps: number[] = [];
  for (let t = 0; t <= duration; t += intervalSeconds) {
    timestamps.push(t);
    if (timestamps.length >= maxFrames) break;
  }
  if (timestamps.length === 0) timestamps.push(0);

  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    await seekVideo(video, t);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), mime, 0.92);
    });

    const url = URL.createObjectURL(blob);
    frames.push({ blob, timestamp: t, url });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / timestamps.length) * 100));
    }
  }

  // Create ZIP using JSZip
  const zip = new JSZip();
  const folder = zip.folder('extracted_frames');
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const ext = format === 'jpeg' ? 'jpg' : format;

  frames.forEach((f, idx) => {
    const padIndex = String(idx + 1).padStart(3, '0');
    const timeSec = f.timestamp.toFixed(1);
    folder?.file(`${baseName}_frame_${padIndex}_${timeSec}s.${ext}`, f.blob);
  });

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  cleanup();

  return { frames, zipBlob };
}

/**
 * Real Video Trimmer & Converter using WebAssembly FFmpeg + Canvas MediaRecorder fallback
 */
export async function processVideo(
  file: File,
  options: VideoConversionOptions,
  onProgress?: (percent: number) => void
): Promise<{ blob: Blob; mimeType: string }> {
  // If no crop and target format is standard, try FFmpeg.wasm first
  if (!options.crop && (options.format || 'mp4')) {
    try {
      const ffmpegBlob = await ffmpegService.convertVideoWithFFmpeg(
        file,
        options.format || 'mp4',
        {
          resolution: options.resolution,
          bitrate: options.bitrate,
          fps: options.fps,
          startTime: options.startTime,
          endTime: options.endTime,
          removeAudio: options.removeAudio,
        },
        onProgress
      );
      return {
        blob: ffmpegBlob,
        mimeType: ffmpegBlob.type || 'video/mp4',
      };
    } catch (ffmpegErr) {
      console.log('Falling back to Canvas MediaRecorder pipeline:', ffmpegErr);
    }
  }

  const requestedFormat = options.format || 'mp4';
  const mimeCandidates = requestedFormat === 'mp4'
    ? ['video/mp4;codecs=avc1', 'video/mp4']
    : requestedFormat === 'webm' ? ['video/webm;codecs=vp9', 'video/webm'] : [];
  const supportedMime = typeof MediaRecorder !== 'undefined'
    ? mimeCandidates.find((mime) => MediaRecorder.isTypeSupported(mime)) : undefined;
  if (!supportedMime) throw new Error(`${requestedFormat.toUpperCase()} encoding requires the FFmpeg engine. Check your connection or choose a supported WebM output.`);
  const { video, cleanup } = await loadVideoElement(file);
  const duration = video.duration;

  const startTime = Math.max(0, options.startTime || 0);
  const endTime = Math.min(duration, options.endTime || duration);
  if (!Number.isFinite(duration) || endTime <= startTime || startTime >= duration) {
    cleanup();
    throw new Error('Choose a valid range within the video duration.');
  }
  const targetDuration = endTime - startTime;

  const srcWidth = video.videoWidth || 1280;
  const srcHeight = video.videoHeight || 720;

  // Calculate canvas dimensions based on resolution or crop
  let targetWidth = options.resolution?.width || srcWidth;
  let targetHeight = options.resolution?.height || srcHeight;

  if (options.crop) {
    targetWidth = options.crop.width;
    targetHeight = options.crop.height;
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;

  await seekVideo(video, startTime);

  const fps = options.fps || 30;
  const canvasStream = canvas.captureStream(fps);

  // Setup audio stream if not removed
  let combinedStream: MediaStream = canvasStream;
  let audioContext: AudioContext | null = null;
  let sourceNode: MediaElementAudioSourceNode | null = null;

  if (!options.removeAudio) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioCtx();
      sourceNode = audioContext.createMediaElementSource(video);
      const destNode = audioContext.createMediaStreamDestination();
      sourceNode.connect(destNode);
      await audioContext.resume();

      combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destNode.stream.getAudioTracks(),
      ]);
    } catch (e) {
      // Audio capture fallback (silence or canvas stream only)
      combinedStream = canvasStream;
    }
  }

  const mimeType = supportedMime;

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: options.bitrate || 2500000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    let animId: number;
    let started = false;

    recorder.onstop = () => {
      cancelAnimationFrame(animId);
      combinedStream.getTracks().forEach((track) => track.stop());
      video.pause();
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
      cleanup();
      resolve({
        blob: new Blob(chunks, { type: mimeType }),
        mimeType,
      });
    };

    recorder.onerror = (e) => {
      cancelAnimationFrame(animId);
      combinedStream.getTracks().forEach((track) => track.stop());
      if (audioContext) void audioContext.close();
      cleanup();
      reject(e);
    };

    video.onplay = () => {
      if (!started) {
        started = true;
        recorder.start(100);
      }
    };

    function renderLoop() {
      if (options.crop) {
        ctx.drawImage(
          video,
          options.crop.x,
          options.crop.y,
          options.crop.width,
          options.crop.height,
          0,
          0,
          targetWidth,
          targetHeight
        );
      } else {
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      }

      const current = video.currentTime;
      const progress = Math.min(99, Math.round(((current - startTime) / targetDuration) * 100));
      if (onProgress) onProgress(progress);

      if (current >= endTime || video.ended) {
        if (recorder.state !== 'inactive') recorder.stop();
      } else {
        animId = requestAnimationFrame(renderLoop);
      }
    }

    renderLoop();
    video.play().catch((err) => {
      // If autoplay policy blocks with sound, mute temporarily
      video.muted = true;
      video.play().catch((error) => {
        cancelAnimationFrame(animId);
        combinedStream.getTracks().forEach((track) => track.stop());
        if (audioContext) void audioContext.close();
        cleanup();
        reject(error);
      });
    });
  });
}

/**
 * Extract audio track directly from video file to high quality WAV
 */
export async function extractAudioFromVideo(
  videoFile: File,
  onProgress?: (percent: number) => void
): Promise<{ blob: Blob; duration: number }> {
  onProgress?.(15);
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  const arrayBuffer = await videoFile.arrayBuffer();

  onProgress?.(45);
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  onProgress?.(80);

  const wavBlob = audioBufferToWav(audioBuffer);
  onProgress?.(100);

  ctx.close();
  return {
    blob: wavBlob,
    duration: audioBuffer.duration,
  };
}

/**
 * Seek HTMLVideoElement helper with promise resolution
 */
function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const target = Math.max(0, Math.min(video.duration || 1, time));
    let timeout: ReturnType<typeof setTimeout>;
    const dispose = () => {
      clearTimeout(timeout);
      video.removeEventListener('seeked', onReady);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('error', onError);
    };
    const onReady = () => {
      if (video.readyState >= 2 && !video.seeking) { dispose(); resolve(); }
    };
    const onError = () => { dispose(); reject(new Error('Could not read this video frame.')); };
    video.addEventListener('seeked', onReady);
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('error', onError);
    timeout = setTimeout(onError, 15000);
    if (Math.abs(video.currentTime - target) < 0.001) onReady();
    else video.currentTime = target;
  });
}
