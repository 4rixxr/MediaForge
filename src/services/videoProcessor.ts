/**
 * MediaForge - Real Client-Side Video Processing Engine
 * Powered by HTML5 Video, Canvas, Web Audio API & MediaRecorder - 100% in-browser, privacy-first
 */

import JSZip from 'jszip';
import { audioBufferToWav } from './audioProcessor';
import { ffmpegService } from './ffmpegService';

export interface VideoConversionOptions {
  format?: 'mp4' | 'webm' | 'mkv' | 'mov' | 'gif' | 'avi' | 'ts' | 'mpeg' | 'mpeg2' | 'dat';
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
export async function loadVideoElement(file:File|Blob):Promise<{video:HTMLVideoElement;cleanup:()=>void;preview:Blob}>{
 const load=(blob:Blob)=>new Promise<{video:HTMLVideoElement;cleanup:()=>void;preview:Blob}>((resolve,reject)=>{
  const video=document.createElement('video'),url=URL.createObjectURL(blob);
  let settled=false;
  const cleanup=()=>{clearTimeout(timer);video.onloadedmetadata=null;video.ondurationchange=null;video.onerror=null;video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);};
  const fail=()=>{if(settled)return;settled=true;cleanup();reject(Error('Video tidak dapat dibaca atau durasinya tidak valid.'));};
  const timer=setTimeout(fail,15000);
  const ready=()=>{if(settled)return;if(Number.isFinite(video.duration)&&video.duration>0&&video.videoWidth>0){settled=true;clearTimeout(timer);video.onloadedmetadata=null;video.ondurationchange=null;video.onerror=null;video.currentTime=0;resolve({video,cleanup,preview:blob});}else if(video.duration===Infinity)video.currentTime=1e10;};
  video.preload='auto';video.onloadedmetadata=ready;video.ondurationchange=ready;video.onerror=fail;video.src=url;
 });
 try{return await load(file);}catch{
  // Preview-only transcode for containers the browser cannot decode (e.g. MPEG).
  const preview=await ffmpegService.convertVideoWithFFmpeg(file instanceof File?file:new File([file],'video-input'),'mp4',{bitrate:2500000});
  return load(preview);
 }
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
  if(!Number.isFinite(intervalSeconds)||intervalSeconds<=0||!Number.isInteger(maxFrames)||maxFrames<1||maxFrames>600)throw Error('Interval harus lebih dari nol; maksimum 600 frame.');
  const { video, cleanup } = await loadVideoElement(file);
  try {
  const duration = video.duration || 1;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d')!;

  const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
  const frames: { blob: Blob; timestamp: number; url: string }[] = [];

  const timestamps: number[] = [];
  for (let t = 0; t < duration; t += intervalSeconds) {
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
  return { frames, zipBlob };
  }finally{cleanup();}
}

/**
 * Video processing through the validated native/WASM FFmpeg conversion path
 */
export async function processVideo(
  file: File,
  options: VideoConversionOptions,
  onProgress?: (percent: number) => void
): Promise<{ blob: Blob; mimeType: string }> {
  const blob=await ffmpegService.convertVideoWithFFmpeg(file,options.format||'mp4',options,onProgress);
  return {blob,mimeType:blob.type};
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
