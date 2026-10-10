export type ToolCategory = 'home' | 'video' | 'audio' | 'image' | 'document' | 'tools';

export type ToolId =
  | 'dashboard'
  | 'url-downloader'
  // Video
  | 'video-converter'
  | 'video-compressor'
  | 'video-resizer'
  | 'video-cropper'
  | 'video-trimmer'
  | 'video-to-gif'
  | 'video-to-image'
  | 'extract-audio'
  // Audio
  | 'audio-converter'
  | 'audio-compressor'
  | 'audio-cutter'
  | 'audio-merger'
  | 'audio-to-video'
  // Image
  | 'image-converter'
  | 'image-compressor'
  | 'image-resizer'
  | 'image-cropper'
  | 'image-to-pdf'
  | 'image-to-ico'
  | 'image-to-webp'
  // Document
  | 'pdf-tools'
  | 'file-converter'
  // Tools
  | 'batch-converter'
  | 'media-info'
  | 'history'
  | 'settings';

export interface ToolDef {
  id: ToolId;
  name: string;
  category: ToolCategory;
  description: string;
  iconName: string;
  badge?: string;
  popular?: boolean;
}

export type JobStatus = 'waiting' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface QueueJob {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  file: File;
  targetFormat: string;
  category: 'video' | 'audio' | 'image' | 'document';
  status: JobStatus;
  progress: number;
  outputBlob?: Blob;
  outputUrl?: string;
  outputFileName?: string;
  outputSize?: number;
  errorMessage?: string;
  settings?: Record<string, any>;
  duration?: number;
  timestamp: number;
}

export interface MediaMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  duration?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  audioChannels?: number;
  sampleRate?: number;
  videoCodec?: string;
  audioCodec?: string;
  bitrate?: number;
  colorSpace?: string;
  lastModified?: number;
}

export interface HistoryItem {
  id: string;
  inputFileName: string;
  outputFileName: string;
  inputSize: number;
  outputSize: number;
  inputFormat: string;
  outputFormat: string;
  category: string;
  date: string;
  timestamp: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultVideoFormat: string;
  defaultAudioFormat: string;
  defaultImageFormat: string;
  defaultQuality: number;
  autoDownload: boolean;
  confirmBeforeClear: boolean;
  hardwareAcceleration: boolean;
  parallelConversions: number;
}
