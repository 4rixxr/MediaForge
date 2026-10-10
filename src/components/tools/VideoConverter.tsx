import React, { useState, useEffect } from 'react';
import {
  Video,
  Settings2,
  Trash2,
  Download,
  Play,
  RotateCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileVideo,
  VolumeX,
} from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { PrivacyIndicator } from '../common/PrivacyIndicator';
import { processVideo, loadVideoElement } from '../../services/videoProcessor';
import { useHistory } from '../../context/HistoryContext';

interface VideoFileItem {
  id: string;
  file: File;
  previewUrl: string;
  duration: number;
  width: number;
  height: number;
  size: number;
  targetFormat: string;
  status: 'idle' | 'converting' | 'done' | 'error';
  progress: number;
  outputBlob?: Blob;
  outputUrl?: string;
  errorMessage?: string;
}

export const VideoConverter: React.FC = () => {
  const [items, setItems] = useState<VideoFileItem[]>([]);
  const [targetFormat, setTargetFormat] = useState('mp4');
  const [videoCodec, setVideoCodec] = useState('h264');
  const [resolutionPreset, setResolutionPreset] = useState('original');
  const [frameRate, setFrameRate] = useState('original');
  const [bitrateMode, setBitrateMode] = useState('medium');
  const [audioCodec, setAudioCodec] = useState('aac');
  const [audioBitrate, setAudioBitrate] = useState('192');
  const [removeAudio, setRemoveAudio] = useState(false);
  const [highQualityMode, setHighQualityMode] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { addHistoryItem } = useHistory();

  const formats = ['MP4', 'WEBM', 'MKV', 'MOV', 'AVI', 'GIF', 'TS'];

  const handleFilesAdded = async (files: File[]) => {
    for (const file of files) {
      try {
        const previewUrl = URL.createObjectURL(file);
        const { video, cleanup } = await loadVideoElement(file);
        const newItem: VideoFileItem = {
          id: 'v-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          file,
          previewUrl,
          duration: video.duration || 0,
          width: video.videoWidth || 1280,
          height: video.videoHeight || 720,
          size: file.size,
          targetFormat: targetFormat.toLowerCase(),
          status: 'idle',
          progress: 0,
        };
        cleanup();
        setItems((prev) => [...prev, newItem]);
      } catch (e) {
        console.error('Failed to parse video metadata', e);
      }
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / 1024).toFixed(0) + ' KB';
  };

  const convertSingleItem = async (item: VideoFileItem) => {
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, status: 'converting', progress: 5, errorMessage: undefined } : it))
    );

    try {
      // Calculate target resolution
      let resWidth = item.width;
      let resHeight = item.height;
      if (resolutionPreset === '1080p') {
        resWidth = 1920;
        resHeight = 1080;
      } else if (resolutionPreset === '720p') {
        resWidth = 1280;
        resHeight = 720;
      } else if (resolutionPreset === '480p') {
        resWidth = 854;
        resHeight = 480;
      }

      // Calculate bitrate
      let bps = 2500000;
      if (bitrateMode === 'low') bps = 1000000;
      if (bitrateMode === 'high') bps = 5000000;
      if (highQualityMode) bps = Math.round(bps * 1.5);

      const fpsVal = frameRate === '60' ? 60 : frameRate === '24' ? 24 : 30;

      const result = await processVideo(
        item.file,
        {
          format: targetFormat.toLowerCase() as any,
          resolution: resolutionPreset !== 'original' ? { width: resWidth, height: resHeight } : undefined,
          bitrate: bps,
          fps: fpsVal,
          removeAudio,
        },
        (progress) => {
          setItems((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, progress } : it))
          );
        }
      );

      const outputUrl = URL.createObjectURL(result.blob);
      const outExt = targetFormat.toLowerCase();
      const outputFileName = `${item.file.name.replace(/\.[^/.]+$/, '')}_converted.${outExt}`;

      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                status: 'done',
                progress: 100,
                outputBlob: result.blob,
                outputUrl,
              }
            : it
        )
      );

      addHistoryItem({
        inputFileName: item.file.name,
        outputFileName,
        inputSize: item.size,
        outputSize: result.blob.size,
        inputFormat: item.file.name.split('.').pop()?.toUpperCase() || 'VIDEO',
        outputFormat: targetFormat.toUpperCase(),
        category: 'video',
      });
    } catch (err: any) {
      console.error(err);
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, status: 'error', progress: 0, errorMessage: err.message || 'Browser encoding error' }
            : it
        )
      );
    }
  };

  const convertAll = async () => {
    const idleItems = items.filter((it) => it.status === 'idle' || it.status === 'error');
    for (const item of idleItems) {
      await convertSingleItem(item);
    }
  };

  const downloadFile = (item: VideoFileItem) => {
    if (!item.outputBlob) return;
    const a = document.createElement('a');
    a.href = item.outputUrl || URL.createObjectURL(item.outputBlob);
    a.download = `${item.file.name.replace(/\.[^/.]+$/, '')}.${targetFormat.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Video size={18} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Video Converter</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Convert any video file to MP4, WebM, MKV, AVI, or GIF with full control over codecs and bitrates.
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={convertAll}
              disabled={items.every((it) => it.status === 'converting')}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              <RotateCw size={14} className={items.some((it) => it.status === 'converting') ? 'animate-spin' : ''} />
              Convert All Files
            </button>
          </div>
        )}
      </div>

      {/* Upload Drop Zone */}
      <DropZone
        onFilesSelected={handleFilesAdded}
        accept="video/*,.mp4,.mkv,.mov,.avi,.webm,.wmv,.flv,.ts"
        label="Drop video files here"
        description="Supports MP4, MOV, WEBM, MKV, AVI, FLV, and TS videos"
        compact={items.length > 0}
      />

      {/* Local Processing & Privacy Indicator */}
      <PrivacyIndicator />

      {/* Format Selector Bar */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Format:</span>
            <div className="flex flex-wrap gap-1">
              {formats.map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setTargetFormat(fmt)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    targetFormat === fmt
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <Sliders size={14} />
            <span>{showAdvanced ? 'Hide Settings' : 'Advanced Settings'}</span>
          </button>
        </div>

        {/* Advanced Settings Drawer */}
        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Video Codec</label>
              <select
                value={videoCodec}
                onChange={(e) => setVideoCodec(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="h264">H.264 / AVC (Most Compatible)</option>
                <option value="hevc">H.265 / HEVC</option>
                <option value="vp9">VP9 (High Web Efficiency)</option>
                <option value="av1">AV1 (Next-Gen)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Resolution</label>
              <select
                value={resolutionPreset}
                onChange={(e) => setResolutionPreset(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="original">Original Resolution</option>
                <option value="1080p">1920 × 1080 (1080p FHD)</option>
                <option value="720p">1280 × 720 (720p HD)</option>
                <option value="480p">854 × 480 (480p SD)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Frame Rate</label>
              <select
                value={frameRate}
                onChange={(e) => setFrameRate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="original">Original FPS</option>
                <option value="60">60 FPS (Smooth)</option>
                <option value="30">30 FPS (Standard)</option>
                <option value="24">24 FPS (Cinematic)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Video Bitrate</label>
              <select
                value={bitrateMode}
                onChange={(e) => setBitrateMode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="medium">Medium Bitrate (~2.5 Mbps)</option>
                <option value="high">High Bitrate (~5.0 Mbps)</option>
                <option value="low">Low Bitrate (~1.0 Mbps)</option>
              </select>
            </div>

            {/* Audio Options */}
            <div className="flex items-center gap-4 sm:col-span-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={removeAudio}
                  onChange={(e) => setRemoveAudio(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span>Remove audio track (Mute)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={highQualityMode}
                  onChange={(e) => setHighQualityMode(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span>High Quality Mode</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Video Files List */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Files Queue ({items.length})</span>
            <button
              onClick={() => setItems([])}
              className="hover:text-rose-500 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-2.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5 gap-4 shadow-xs"
              >
                {/* Thumbnail and specs */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-black">
                    <video
                      src={item.previewUrl}
                      className="h-full w-full object-cover"
                      muted
                      preload="metadata"
                    />
                    <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[9px] font-mono text-white">
                      {formatSeconds(item.duration)}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {item.file.name}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{item.width} × {item.height}</span>
                      <span>•</span>
                      <span>{formatSeconds(item.duration)}</span>
                      <span>•</span>
                      <span>{formatFileSize(item.size)}</span>
                      <span>•</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                        → {targetFormat}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {item.status === 'converting' && (
                      <div className="mt-2 w-full space-y-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full bg-indigo-600 transition-all duration-200"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400">Encoding in browser: {item.progress}%</div>
                      </div>
                    )}

                    {item.status === 'error' && (
                      <div className="mt-1 text-[11px] text-rose-500 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {item.errorMessage || 'Conversion failed'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {item.status === 'done' ? (
                    <button
                      onClick={() => downloadFile(item)}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition-colors"
                    >
                      <Download size={13} />
                      Download ({formatFileSize(item.outputBlob?.size || 0)})
                    </button>
                  ) : item.status === 'converting' ? (
                    <span className="flex items-center gap-1 text-xs text-indigo-500 animate-pulse font-medium">
                      <RotateCw size={12} className="animate-spin" />
                      Converting...
                    </span>
                  ) : (
                    <button
                      onClick={() => convertSingleItem(item)}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      Convert Now
                    </button>
                  )}

                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg"
                    title="Remove item"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
