import {reportToolError} from '../../services/toolErrors';
import React, { useState, useEffect } from 'react';
import { Minimize2, Download, RotateCw, CheckCircle2, Sliders, AlertCircle } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { processVideo, loadVideoElement } from '../../services/videoProcessor';
import { useHistory } from '../../context/HistoryContext';

export const VideoCompressor: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [videoMeta, setVideoMeta] = useState<{ duration: number; width: number; height: number } | null>(null);
  const [preset, setPreset] = useState<'max' | 'high' | 'balanced' | 'small' | 'custom'>('balanced');
  const [resolutionScale, setResolutionScale] = useState<number>(720); // 1080, 720, 480
  const [customBitrate, setCustomBitrate] = useState<number>(1500); // in kbps
  const [fps, setFps] = useState<number>(30);
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const { addHistoryItem } = useHistory();

  const handleFile = async (files: File[]) => {
    if (!files[0]) return;
    const f = files[0];
    setFile(f);
    setResultBlob(null);

    try {
      const { video, cleanup } = await loadVideoElement(f);
      setVideoMeta({
        duration: video.duration || 0,
        width: video.videoWidth || 1280,
        height: video.videoHeight || 720,
      });
      cleanup();
    } catch (e) {
      reportToolError(e);
    }
  };

  // Preset reductions and bitrates
  const getPresetBitrate = () => {
    switch (preset) {
      case 'max': return 4000;
      case 'high': return 2500;
      case 'balanced': return 1400;
      case 'small': return 750;
      case 'custom': return customBitrate;
    }
  };

  const originalSizeMb=file?file.size/1048576:0;
  const estimatedSizeMb=(videoMeta?.duration||0)*(getPresetBitrate()+128)*1000/8/1048576;
  const reductionPercent=resultBlob&&file?Math.round((1-resultBlob.size/file.size)*100):null;
  useEffect(()=>setResultBlob(null),[file,preset,resolutionScale,customBitrate,fps]);

  const runCompress = async () => {
    if (!file||!videoMeta) return;
    setIsCompressing(true);
    setProgress(5);

    try {
      const bps = getPresetBitrate() * 1000;
      const targetHeight = Math.max(2,Math.floor(Math.min(videoMeta.height,preset==='small'?480:preset==='balanced'?720:resolutionScale)/2)*2);
      const targetWidth = Math.max(2,Math.round(targetHeight*videoMeta.width/videoMeta.height/2)*2);

      const res = await processVideo(
        file,
        {
          format: 'mp4',
          bitrate: bps,
          fps,
          resolution: { width: targetWidth, height: targetHeight },
        },
        (p) => setProgress(p)
      );

      setResultBlob(res.blob);
      setIsCompressing(false);

      addHistoryItem({
        inputFileName: file.name,
        outputFileName: `${file.name.replace(/\.[^/.]+$/, '')}_compressed.mp4`,
        inputSize: file.size,
        outputSize: res.blob.size,
        inputFormat: file.name.split('.').pop()?.toUpperCase() || 'VIDEO',
        outputFormat: 'MP4',
        category: 'video',
      });
    } catch (err) {
      reportToolError(err);
      setIsCompressing(false);
    }
  };

  const downloadCompressed = () => {
    if (!resultBlob || !file) return;
    const a = document.createElement('a');
    const downloadUrl = URL.createObjectURL(resultBlob);
    a.href = downloadUrl;
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}_compressed.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(downloadUrl),60000);
  };

  return (
    <fieldset disabled={isCompressing} style={{minWidth:0}} className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
          <Minimize2 size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Video Compressor</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pilih target bitrate dan resolusi. Ukuran hasil bergantung pada sumber dan dapat lebih besar daripada aslinya.
          </p>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="video/*"
          multiple={false}
          label="Choose video to compress"
          description="Drag & drop any video file (MP4, MOV, WebM, MKV)"
        />
      ) : (
        <div className="space-y-6">
          {/* File details card */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{file.name}</h3>
                <div className="text-xs text-slate-500">
                  {videoMeta ? `${videoMeta.width} × ${videoMeta.height} • ${Math.round(videoMeta.duration)}s • ` : ''}
                  {originalSizeMb.toFixed(1)} MB
                </div>
              </div>
              <button
                onClick={() => { setFile(null); setResultBlob(null); }}
                className="text-xs text-slate-400 hover:text-rose-500 self-start sm:self-auto"
              >
                Change File
              </button>
            </div>

            {/* Estimated Size Card */}
            <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-200/60 dark:border-slate-800/60 text-center">
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-medium">Original Size</div>
                <div className="mt-1 text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                  {originalSizeMb.toFixed(1)} MB
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-medium">Estimated Size</div>
                <div className="mt-1 text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {resultBlob?`${(resultBlob.size/1048576).toFixed(2)} MB`:`~${estimatedSizeMb.toFixed(2)} MB`}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-medium">Perubahan ukuran hasil</div>
                <div className="mt-1 text-base sm:text-lg font-bold text-emerald-500">
                  {reductionPercent===null?'—':reductionPercent>=0?`${reductionPercent}% lebih kecil`:`${-reductionPercent}% lebih besar`}
                </div>
              </div>
            </div>

            {/* Presets buttons */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Compression Level Preset:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'max', label: 'Max Quality', sub: '4000 kbps' },
                  { id: 'high', label: 'High Quality', sub: '2500 kbps' },
                  { id: 'balanced', label: 'Balanced', sub: '1400 kbps' },
                  { id: 'small', label: 'Small File', sub: '750 kbps' },
                  { id: 'custom', label: 'Custom', sub: 'Manual specs' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPreset(p.id as any)}
                    className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-center transition-all ${
                      preset === p.id
                        ? 'border-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 shadow-xs'
                        : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold">{p.label}</span>
                    <span className="text-[10px] opacity-75">{p.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Options */}
            {preset === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Target Resolution</label>
                  <select
                    value={resolutionScale}
                    onChange={(e) => setResolutionScale(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
                  >
                    <option value={1080}>1080p Full HD</option>
                    <option value={720}>720p HD</option>
                    <option value={480}>480p SD</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Target Bitrate ({customBitrate} kbps)</label>
                  <input
                    type="range"
                    min="400"
                    max="6000"
                    step="100"
                    value={customBitrate}
                    onChange={(e) => setCustomBitrate(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Frame Rate</label>
                  <select
                    value={fps}
                    onChange={(e) => setFps(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
                  >
                    <option value={30}>30 FPS</option>
                    <option value={24}>24 FPS</option>
                    <option value={60}>60 FPS</option>
                  </select>
                </div>
              </div>
            )}

            {/* Process Action */}
            <div className="pt-2">
              {isCompressing ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <span className="flex items-center gap-1.5">
                      <RotateCw size={14} className="animate-spin" /> Compressing video in browser...
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full bg-indigo-600 transition-all duration-150" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : resultBlob ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={16} />
                    <span>Compression Completed! Output size: {(resultBlob.size / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                  <button
                    onClick={downloadCompressed}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition-colors"
                  >
                    <Download size={14} /> Download Compressed Video
                  </button>
                </div>
              ) : (
                <button
                  onClick={runCompress}
                  className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 transition-colors"
                >
                  Compress Video Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </fieldset>
  );
};
