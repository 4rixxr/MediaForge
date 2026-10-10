/**
 * MediaForge - Media Metadata Inspection Service
 */

import { MediaMetadata } from '../types/media';
import { loadImageFromFile } from './imageProcessor';
import { getAudioContext } from './audioProcessor';
import { loadVideoElement } from './videoProcessor';

export async function inspectMediaFile(file: File): Promise<MediaMetadata> {
  const baseMeta: MediaMetadata = {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || getExtensionMime(file.name),
    lastModified: file.lastModified,
  };

  const type = file.type || '';
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // Inspect Image
  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'ico', 'avif'].includes(ext)) {
    try {
      const img = await loadImageFromFile(file);
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const divisor = gcd(img.naturalWidth, img.naturalHeight);
      const ratio = `${img.naturalWidth / divisor}:${img.naturalHeight / divisor}`;

      return {
        ...baseMeta,
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: ratio,
        colorSpace: 'sRGB / 8-bit per channel',
      };
    } catch (e) {
      return baseMeta;
    }
  }

  // Inspect Video
  if (type.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'avi', 'wmv', 'flv'].includes(ext)) {
    try {
      const { video, cleanup } = await loadVideoElement(file);
      const duration = video.duration || 0;
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      cleanup();

      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const divisor = gcd(width, height) || 1;
      const ratio = `${width / divisor}:${height / divisor}`;
      const bitrate = duration > 0 ? Math.round((file.size * 8) / duration) : undefined;

      return {
        ...baseMeta,
        duration,
        width,
        height,
        aspectRatio: ratio,
        bitrate,
        videoCodec: inferCodec(file.name, file.type),
      };
    } catch (e) {
      return baseMeta;
    }
  }

  // Inspect Audio
  if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'opus'].includes(ext)) {
    try {
      const ctx = getAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const duration = audioBuffer.duration;
      const bitrate = duration > 0 ? Math.round((file.size * 8) / duration) : undefined;

      return {
        ...baseMeta,
        duration,
        sampleRate: audioBuffer.sampleRate,
        audioChannels: audioBuffer.numberOfChannels,
        bitrate,
        audioCodec: inferAudioCodec(file.name, file.type),
      };
    } catch (e) {
      return baseMeta;
    }
  }

  return baseMeta;
}

function getExtensionMime(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'mov': return 'video/quicktime';
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'ogg': return 'audio/ogg';
    case 'flac': return 'audio/flac';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}

function inferCodec(filename: string, mime: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'mp4') return 'H.264 / AVC or HEVC';
  if (ext === 'webm') return 'VP8 / VP9 / AV1';
  if (ext === 'mov') return 'Apple ProRes / H.264';
  if (ext === 'mkv') return 'Matroska / H.264 / H.265';
  return mime || 'Video Stream';
}

function inferAudioCodec(filename: string, mime: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'mp3') return 'MPEG-1 Audio Layer III';
  if (ext === 'wav') return 'Linear PCM (16/24-bit)';
  if (ext === 'flac') return 'Free Lossless Audio Codec';
  if (ext === 'aac' || ext === 'm4a') return 'Advanced Audio Coding (AAC)';
  if (ext === 'ogg' || ext === 'opus') return 'Ogg Opus / Vorbis';
  return mime || 'Audio Stream';
}
