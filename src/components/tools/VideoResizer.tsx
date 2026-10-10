import React, { useState } from 'react';
import { Maximize2, Download, RotateCw, CheckCircle2 } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { processVideo, loadVideoElement } from '../../services/videoProcessor';

export const VideoResizer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [videoMeta, setVideoMeta] = useState<{ width: number; height: number; duration: number } | null>(null);
  const [preset, setPreset] = useState<string>('1080p');
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [keepAspect, setKeepAspect] = useState(true);
  const [aspectPreset, setAspectPreset] = useState('16:9');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const handleFile = async (files: File[]) => {
    if (!files[0]) return;
    const f = files[0];
    setFile(f);
    setResultBlob(null);

    const { video, cleanup } = await loadVideoElement(f);
    setVideoMeta({
      width: video.videoWidth || 1280,
      height: video.videoHeight || 720,
      duration: video.duration || 0,
    });
    setCustomWidth(video.videoWidth || 1280);
    setCustomHeight(video.videoHeight || 720);
    cleanup();
  };

  const handlePresetChange = (p: string) => {
    setPreset(p);
    if (!videoMeta) return;

    if (p === '4k') {
      setCustomWidth(3840);
      setCustomHeight(2160);
    } else if (p === '1440p') {
      setCustomWidth(2560);
      setCustomHeight(1440);
    } else if (p === '1080p') {
      setCustomWidth(1920);
      setCustomHeight(1080);
    } else if (p === '720p') {
      setCustomWidth(1280);
      setCustomHeight(720);
    } else if (p === '480p') {
      setCustomWidth(854);
      setCustomHeight(480);
    } else if (p === '360p') {
      setCustomWidth(640);
      setCustomHeight(360);
    } else if (p === 'original') {
      setCustomWidth(videoMeta.width);
      setCustomHeight(videoMeta.height);
    }
  };

  const runResize = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(5);

    try {
      const res = await processVideo(
        file,
        {
          resolution: { width: customWidth, height: customHeight },
          bitrate: 3000000,
        },
        (p) => setProgress(p)
      );

      setResultBlob(res.blob);
      setIsProcessing(false);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  const downloadVideo = () => {
    if (!resultBlob || !file) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultBlob);
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}_${customWidth}x${customHeight}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
          <Maximize2 size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Video Resizer</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Scale video resolution and aspect ratios with hardware-accelerated canvas smoothing.
          </p>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="video/*"
          multiple={false}
          label="Select video to resize"
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{file.name}</div>
              <div className="text-xs text-slate-500">
                Original: {videoMeta?.width} × {videoMeta?.height} px
              </div>
            </div>
            <button
              onClick={() => { setFile(null); setResultBlob(null); }}
              className="text-xs text-slate-400 hover:text-rose-500"
            >
              Choose another
            </button>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Resolution Preset:
            </label>
            <div className="flex flex-wrap gap-2">
              {['original', '4k', '1440p', '1080p', '720p', '480p', '360p'].map((p) => (
                <button
                  key={p}
                  onClick={() => handlePresetChange(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-all ${
                    preset === p
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Width / Height inputs */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Target Width (px)</label>
              <input
                type="number"
                value={customWidth}
                onChange={(e) => {
                  const w = Number(e.target.value);
                  setCustomWidth(w);
                  if (keepAspect && videoMeta) {
                    setCustomHeight(Math.round((w * videoMeta.height) / videoMeta.width));
                  }
                  setPreset('custom');
                }}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Target Height (px)</label>
              <input
                type="number"
                value={customHeight}
                onChange={(e) => {
                  const h = Number(e.target.value);
                  setCustomHeight(h);
                  if (keepAspect && videoMeta) {
                    setCustomWidth(Math.round((h * videoMeta.width) / videoMeta.height));
                  }
                  setPreset('custom');
                }}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={keepAspect}
              onChange={(e) => setKeepAspect(e.target.checked)}
              className="rounded text-indigo-600"
            />
            <span>Maintain original aspect ratio</span>
          </label>

          {/* Action */}
          <div>
            {isProcessing ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-indigo-600">
                  <span className="flex items-center gap-1.5">
                    <RotateCw size={14} className="animate-spin" /> Rendering video to {customWidth}×{customHeight}...
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full bg-indigo-600 transition-all duration-150" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : resultBlob ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Resized Successfully ({customWidth}×{customHeight})
                </span>
                <button
                  onClick={downloadVideo}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  <Download size={13} /> Download
                </button>
              </div>
            ) : (
              <button
                onClick={runResize}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Resize Video Now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
