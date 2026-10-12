/**
 * MediaForge - Local WebAssembly & FFmpeg.wasm Processing Engine
 * 100% In-Browser Execution - Zero Server Uploads - Strict Privacy
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export type FfmpegStatus = 'idle' | 'loading' | 'ready' | 'error' | 'fallback';

export interface FfmpegProgress {
  progress: number; // 0 to 100
  time?: number;
}

class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private status: FfmpegStatus = 'idle';
  private loadPromise: Promise<boolean> | null = null;
  private logs: string[] = [];
  private operationQueue: Promise<unknown> = Promise.resolve();

  // The worker and its virtual filesystem can only execute one conversion at a time.
  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const pending = this.operationQueue.then(operation, operation);
    this.operationQueue = pending.catch(() => undefined);
    return pending;
  }

  public getStatus(): FfmpegStatus {
    return this.status;
  }

  public isAvailable(): boolean {
    return this.status === 'ready';
  }

  /**
   * Initializes and loads the WebAssembly FFmpeg core into the browser
   */
  public async load(onProgress?: (msg: string) => void): Promise<boolean> {
    if (this.status === 'ready') return true;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      this.status = 'loading';
      onProgress?.('Initializing WebAssembly core...');

      try {
        this.ffmpeg = new FFmpeg();

        this.ffmpeg.on('log', ({ message }) => {
          this.logs.push(message);
          if (this.logs.length > 100) this.logs.shift();
        });

        // Use unpkg CDN for the WebAssembly core files
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        onProgress?.('Downloading FFmpeg.wasm WebAssembly binary...');

        const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

        await this.ffmpeg.load({
          coreURL,
          wasmURL,
        });

        this.status = 'ready';
        onProgress?.('WebAssembly FFmpeg ready');
        return true;
      } catch (err) {
        console.warn('FFmpeg.wasm could not be initialized:', err);
        this.status = 'fallback';
        return false;
      }
    })();

    return this.loadPromise;
  }

  /**
   * Execute video conversion locally using FFmpeg.wasm
   */
  public async convertVideoWithFFmpeg(
    file: File,
    targetFormat: string,
    options?: {
      videoCodec?: string;
      resolution?: { width: number; height: number };
      bitrate?: number;
      fps?: number;
      startTime?: number;
      endTime?: number;
      removeAudio?: boolean;
    },
    onProgress?: (progressPercent: number) => void
  ): Promise<Blob> {
    return this.serialize(() => this.runVideoConversion(file, targetFormat, options, onProgress));
  }

  private async runVideoConversion(
    file: File,
    targetFormat: string,
    options?: {
      videoCodec?: string;
      resolution?: { width: number; height: number };
      bitrate?: number;
      fps?: number;
      startTime?: number;
      endTime?: number;
      removeAudio?: boolean;
    },
    onProgress?: (progressPercent: number) => void
  ): Promise<Blob> {
    const isLoaded = await this.load();
    if (!isLoaded || !this.ffmpeg) {
      throw new Error('FFmpeg WebAssembly is not available');
    }

    const inputName = `input_${Date.now()}.${file.name.split('.').pop() || 'mp4'}`;
    const outputExt = targetFormat.toLowerCase();
    const outputName = `output_${Date.now()}.${outputExt}`;

    onProgress?.(5);

    // Listen to progress events
    const progressHandler = ({ progress }: { progress: number }) => {
      const pct = Math.min(99, Math.max(5, Math.round(progress * 100)));
      onProgress?.(pct);
    };

    this.ffmpeg.on('progress', progressHandler);

    try {
      // Write input file to in-memory virtual filesystem
      const fileData = await fetchFile(file);
      await this.ffmpeg.writeFile(inputName, fileData);

      const args: string[] = ['-y', '-i', inputName];

      // Trim options
      if (typeof options?.startTime === 'number' && options.startTime > 0) {
        args.push('-ss', options.startTime.toString());
      }
      if (typeof options?.endTime === 'number' && options.endTime > 0) {
        args.push('-to', options.endTime.toString());
      }

      // Video filters (scaling & fps)
      const vfParts: string[] = [];
      if (options?.resolution?.width && options?.resolution?.height) {
        vfParts.push(`scale=${options.resolution.width}:${options.resolution.height}`);
      }
      if (options?.fps) {
        vfParts.push(`fps=${options.fps}`);
      }
      if (vfParts.length > 0) {
        args.push('-vf', vfParts.join(','));
      }

      // Bitrate
      if (options?.bitrate) {
        args.push('-b:v', `${Math.round(options.bitrate / 1000)}k`);
      }

      // Remove audio
      if (options?.removeAudio) {
        args.push('-an');
      }

      // Codec tuning based on output format
      if (outputExt === 'mp4') {
        args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p');
      } else if (outputExt === 'webm') {
        args.push('-c:v', 'libvpx', '-deadline', 'realtime', '-c:a', 'libvorbis');
      } else if (outputExt === 'gif') {
        args.push('-loop', '0');
      }

      args.push(outputName);

      // Execute command in WebAssembly
      const exitCode = await this.ffmpeg.exec(args);
      if (exitCode !== 0) throw new Error('Conversion failed. The source or requested codec may not be supported.');

      // Read output file from virtual filesystem
      const data = await this.ffmpeg.readFile(outputName);
      const mime = getMimeForFormat(outputExt);
      const blob = new Blob([data as any], { type: mime });

      // Clean up virtual files
      try {
        await this.ffmpeg.deleteFile(inputName);
        await this.ffmpeg.deleteFile(outputName);
      } catch (cleanupErr) {
        // ignore delete errors
      }

      onProgress?.(100);
      return blob;
    } finally {
      this.ffmpeg.off('progress', progressHandler);
      await Promise.allSettled([this.ffmpeg.deleteFile(inputName), this.ffmpeg.deleteFile(outputName)]);
    }
  }

  /**
   * Execute audio conversion locally using FFmpeg.wasm
   */
  public async convertAudioWithFFmpeg(
    file: File,
    targetFormat: string,
    options?: {
      bitrate?: number;
      sampleRate?: number;
      channels?: 1 | 2;
      startTime?: number;
      endTime?: number;
    },
    onProgress?: (progressPercent: number) => void
  ): Promise<Blob> {
    return this.serialize(() => this.runAudioConversion(file, targetFormat, options, onProgress));
  }

  public audioToVideo(file: File, format: string, options: {videoBitrate?: number; fps?: number}, onProgress?: (percent:number)=>void): Promise<Blob> {
    return this.serialize(async () => {
      if (!['mp4','webm'].includes(format)) throw new Error('Pilih MP4 atau WebM untuk audio ke video.');
      if (!(await this.load()) || !this.ffmpeg) throw new Error('Mesin video belum tersedia. Periksa koneksi lalu coba lagi.');
      const input = `audio_${Date.now()}.${file.name.split('.').pop() || 'wav'}`;
      const output = `video_${Date.now()}.${format}`;
      const engine = this.ffmpeg;
      const progress = ({progress}:{progress:number}) => onProgress?.(Math.min(99,Math.max(5,Math.round(progress*100))));
      engine.on('progress',progress);
      try {
        await engine.writeFile(input,await fetchFile(file));
        const codec = format === 'mp4' ? ['-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac'] : ['-c:v','libvpx','-deadline','realtime','-c:a','libopus'];
        const code = await engine.exec(['-y','-f','lavfi','-i',`color=c=0x211a38:s=1280x720:r=${options.fps || 30}`,'-i',input,'-map','0:v:0','-map','1:a:0',...codec,'-b:v',String(options.videoBitrate || 2500000),'-b:a','192k','-shortest',output]);
        if (code !== 0) throw new Error('Audio tidak dapat dibuat menjadi video. Periksa format sumber.');
        const blob = new Blob([await engine.readFile(output) as any],{type:getMimeForFormat(format)});
        onProgress?.(100);
        return blob;
      } finally {
        engine.off('progress',progress);
        await Promise.allSettled([engine.deleteFile(input),engine.deleteFile(output)]);
      }
    });
  }

  private async runAudioConversion(
    file: File,
    targetFormat: string,
    options?: {
      bitrate?: number;
      sampleRate?: number;
      channels?: 1 | 2;
      startTime?: number;
      endTime?: number;
    },
    onProgress?: (progressPercent: number) => void
  ): Promise<Blob> {
    const isLoaded = await this.load();
    if (!isLoaded || !this.ffmpeg) {
      throw new Error('FFmpeg WebAssembly is not available');
    }

    const inputName = `input_${Date.now()}.${file.name.split('.').pop() || 'mp3'}`;
    const outputExt = targetFormat.toLowerCase();
    const outputName = `output_${Date.now()}.${outputExt}`;

    onProgress?.(5);

    const progressHandler = ({ progress }: { progress: number }) => {
      const pct = Math.min(99, Math.max(5, Math.round(progress * 100)));
      onProgress?.(pct);
    };

    this.ffmpeg.on('progress', progressHandler);

    try {
      const fileData = await fetchFile(file);
      await this.ffmpeg.writeFile(inputName, fileData);

      const args: string[] = ['-y', '-i', inputName, '-vn'];

      if (typeof options?.startTime === 'number' && options.startTime > 0) {
        args.push('-ss', options.startTime.toString());
      }
      if (typeof options?.endTime === 'number' && options.endTime > 0) {
        args.push('-to', options.endTime.toString());
      }

      if (options?.bitrate) {
        args.push('-b:a', `${options.bitrate}k`);
      }
      if (options?.sampleRate) {
        args.push('-ar', options.sampleRate.toString());
      }
      if (options?.channels) {
        args.push('-ac', options.channels.toString());
      }

      args.push(outputName);

      const exitCode = await this.ffmpeg.exec(args);
      if (exitCode !== 0) throw new Error('Conversion failed. The source or requested codec may not be supported.');

      const data = await this.ffmpeg.readFile(outputName);
      const mime = getAudioMimeForFormat(outputExt);
      const blob = new Blob([data as any], { type: mime });

      try {
        await this.ffmpeg.deleteFile(inputName);
        await this.ffmpeg.deleteFile(outputName);
      } catch (cleanupErr) {
        // ignore
      }

      onProgress?.(100);
      return blob;
    } finally {
      this.ffmpeg.off('progress', progressHandler);
      await Promise.allSettled([this.ffmpeg.deleteFile(inputName), this.ffmpeg.deleteFile(outputName)]);
    }
  }
}

function getMimeForFormat(ext: string): string {
  switch (ext) {
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'mkv': return 'video/x-matroska';
    case 'avi': return 'video/x-msvideo';
    case 'mov': return 'video/quicktime';
    case 'gif': return 'image/gif';
    default: return 'application/octet-stream';
  }
}

function getAudioMimeForFormat(ext: string): string {
  switch (ext) {
    case 'mp3': return 'audio/mpeg';
    case 'm4a': return 'audio/mp4';
    case 'wav': return 'audio/wav';
    case 'aac': return 'audio/aac';
    case 'ogg': return 'audio/ogg';
    case 'flac': return 'audio/flac';
    case 'opus': return 'audio/opus';
    default: return 'application/octet-stream';
  }
}

export const ffmpegService = new FFmpegService();
