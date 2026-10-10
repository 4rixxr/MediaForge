import React, { useState } from 'react';
import { Film, Download, RotateCw, CheckCircle2, Sparkles } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { processVideo, loadVideoElement } from '../../services/videoProcessor';

export const VideoToGif: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(3);
  const [fps, setFps] = useState(15);
  const [gifWidth, setGifWidth] = useState(480);
  const [preset, setPreset] = useState<'small' | 'medium' | 'high'>('medium');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleFile = async (files: File[]) => {
    if (!files[0]) return;
    const f = files[0];
    setFile(f);
    setResultBlob(null);
    setResultUrl(null);

    const { video, cleanup } = await loadVideoElement(f);
    const dur = video.duration || 5;
    setDuration(dur);
    setStartTime(0);
    setEndTime(Math.min(dur, 4));
    cleanup();
  };

  const applyPreset = (p: 'small' | 'medium' | 'high') => {
    setPreset(p);
    if (p === 'small') {
      setFps(10);
      setGifWidth(320);
    } else if (p === 'medium') {
      setFps(15);
      setGifWidth(480);
    } else {
      setFps(24);
      setGifWidth(640);
    }
  };

  const clipDuration = Math.max(0.5, endTime - startTime);
  const estimatedSizeMb = ((gifWidth * (gifWidth * 0.56) * fps * clipDuration * 0.15) / (1024 * 1024)).toFixed(1);

  const runConvert = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(5);

    try {
      const targetHeight = Math.round((gifWidth * 9) / 16);
      const res = await processVideo(
        file,
        {
          startTime,
          endTime,
          fps,
          resolution: { width: gifWidth, height: targetHeight },
          removeAudio: true,
          bitrate: preset === 'high' ? 2500000 : 1200000,
        },
        (p) => setProgress(p)
      );

      const url = URL.createObjectURL(res.blob);
      setResultBlob(res.blob);
      setResultUrl(url);
      setIsProcessing(false);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  const downloadGif = () => {
    if (!resultBlob || !file) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultBlob);
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}.gif`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500">
          <Film size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Video to GIF Maker</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create lightweight, looping animated GIFs from any video clip.
          </p>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="video/*"
          multiple={false}
          label="Choose video to turn into GIF"
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{file.name}</span>
            <button
              onClick={() => { setFile(null); setResultBlob(null); setResultUrl(null); }}
              className="text-xs text-slate-400 hover:text-rose-500"
            >
              Choose different file
            </button>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Preset Quality:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'small', label: 'Small GIF', sub: '320px • 10 FPS (Lightweight)' },
                { id: 'medium', label: 'Medium GIF', sub: '480px • 15 FPS (Balanced)' },
                { id: 'high', label: 'High Quality GIF', sub: '640px • 24 FPS (Crisp)' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id as any)}
                  className={`rounded-xl p-3 text-left transition-all ${
                    preset === p.id
                      ? 'border-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="text-xs font-bold">{p.label}</div>
                  <div className="text-[10px] opacity-75">{p.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Time range selection */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-500 mb-1">Start Time (seconds)</label>
              <input
                type="number"
                min="0"
                max={duration}
                step="0.1"
                value={startTime}
                onChange={(e) => setStartTime(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">End Time (seconds)</label>
              <input
                type="number"
                min="0.1"
                max={duration}
                step="0.1"
                value={endTime}
                onChange={(e) => setEndTime(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
              />
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 dark:bg-slate-950/50 p-3 border border-slate-200/80 dark:border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-500">Clip Duration: {clipDuration.toFixed(1)}s</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              Estimated Size: ~{estimatedSizeMb} MB
            </span>
          </div>

          {/* Output Preview */}
          {resultUrl && (
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950/20 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-400 mb-2">GIF Animation Preview:</div>
              <video
                src={resultUrl}
                autoPlay
                loop
                muted
                playsInline
                className="max-h-64 rounded-lg shadow-md"
              />
            </div>
          )}

          {/* Actions */}
          <div>
            {isProcessing ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-indigo-600">
                  <span className="flex items-center gap-1.5">
                    <RotateCw size={14} className="animate-spin" /> Generating GIF frames...
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
                  <CheckCircle2 size={16} /> GIF Generated Successfully!
                </span>
                <button
                  onClick={downloadGif}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  <Download size={13} /> Download GIF
                </button>
              </div>
            ) : (
              <button
                onClick={runConvert}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Create Animated GIF
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
