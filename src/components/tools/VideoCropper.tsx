import React, { useState, useRef, useEffect } from 'react';
import { Crop, Download, RotateCw, CheckCircle2 } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { processVideo, loadVideoElement } from '../../services/videoProcessor';

export const VideoCropper: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDims, setVideoDims] = useState<{ width: number; height: number } | null>(null);
  const [cropPreset, setCropPreset] = useState<'16:9' | '4:3' | '1:1' | '9:16' | '21:9' | 'custom'>('16:9');
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 640, height: 360 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFile = async (files: File[]) => {
    if (!files[0]) return;
    const f = files[0];
    setFile(f);
    setResultBlob(null);

    const { video, cleanup } = await loadVideoElement(f);
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    setVideoDims({ width: w, height: h });
    setCropRect({ x: 0, y: 0, width: Math.round(w * 0.8), height: Math.round(h * 0.8) });
    cleanup();

    setVideoUrl(URL.createObjectURL(f));
  };

  const applyPreset = (preset: '16:9' | '4:3' | '1:1' | '9:16' | '21:9' | 'custom') => {
    setCropPreset(preset);
    if (!videoDims) return;

    const maxW = videoDims.width;
    const maxH = videoDims.height;
    let targetW = maxW;
    let targetH = maxH;

    if (preset === '16:9') {
      targetH = Math.min(maxH, Math.round((maxW * 9) / 16));
      targetW = Math.round((targetH * 16) / 9);
    } else if (preset === '4:3') {
      targetH = Math.min(maxH, Math.round((maxW * 3) / 4));
      targetW = Math.round((targetH * 4) / 3);
    } else if (preset === '1:1') {
      const minSide = Math.min(maxW, maxH);
      targetW = minSide;
      targetH = minSide;
    } else if (preset === '9:16') {
      targetW = Math.min(maxW, Math.round((maxH * 9) / 16));
      targetH = Math.round((targetW * 16) / 9);
    } else if (preset === '21:9') {
      targetH = Math.min(maxH, Math.round((maxW * 9) / 21));
      targetW = Math.round((targetH * 21) / 9);
    }

    const offsetX = Math.round((maxW - targetW) / 2);
    const offsetY = Math.round((maxH - targetH) / 2);
    setCropRect({ x: offsetX, y: offsetY, width: targetW, height: targetH });
  };

  const runCrop = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(5);

    try {
      const res = await processVideo(
        file,
        {
          crop: cropRect,
          bitrate: 3500000,
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

  const downloadCropped = () => {
    if (!resultBlob || !file) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultBlob);
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}_cropped.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
          <Crop size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Video Cropper</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cut out unwanted outer borders or adjust frame aspect ratio with visual area previews.
          </p>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="video/*"
          multiple={false}
          label="Choose video to crop"
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{file.name}</span>
            <button
              onClick={() => { setFile(null); setVideoUrl(null); setResultBlob(null); }}
              className="text-xs text-slate-400 hover:text-rose-500"
            >
              Choose different file
            </button>
          </div>

          {/* Aspect Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mr-1">Aspect:</span>
            {(['16:9', '4:3', '1:1', '9:16', '21:9', 'custom'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  cropPreset === preset
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Video Preview with overlay border */}
          {videoUrl && (
            <div className="relative overflow-hidden rounded-xl bg-black flex items-center justify-center max-h-96">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="max-h-96 w-auto max-w-full"
              />
              <div className="absolute top-2 left-2 rounded bg-black/75 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                Crop Area: {cropRect.width} × {cropRect.height} px (offset {cropRect.x}, {cropRect.y})
              </div>
            </div>
          )}

          {/* Manual crop coordinates */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 mb-1">X Offset (px)</label>
              <input
                type="number"
                value={cropRect.x}
                onChange={(e) => setCropRect({ ...cropRect, x: Math.max(0, Number(e.target.value)) })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Y Offset (px)</label>
              <input
                type="number"
                value={cropRect.y}
                onChange={(e) => setCropRect({ ...cropRect, y: Math.max(0, Number(e.target.value)) })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Width (px)</label>
              <input
                type="number"
                value={cropRect.width}
                onChange={(e) => setCropRect({ ...cropRect, width: Math.max(10, Number(e.target.value)) })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Height (px)</label>
              <input
                type="number"
                value={cropRect.height}
                onChange={(e) => setCropRect({ ...cropRect, height: Math.max(10, Number(e.target.value)) })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
              />
            </div>
          </div>

          {/* Action */}
          <div>
            {isProcessing ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-indigo-600">
                  <span className="flex items-center gap-1.5">
                    <RotateCw size={14} className="animate-spin" /> Cropping video frame in browser...
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
                  <CheckCircle2 size={16} /> Video Cropped Successfully!
                </span>
                <button
                  onClick={downloadCropped}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  <Download size={13} /> Download Video
                </button>
              </div>
            ) : (
              <button
                onClick={runCrop}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Export Cropped Video
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
