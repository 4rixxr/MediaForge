import {useObjectUrls} from '../../services/useObjectUrls';
import {reportToolError} from '../../services/toolErrors';
import React, { useState, useEffect } from 'react';
import { ImageDown, Download, RotateCw, CheckCircle2, Archive } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { extractVideoFrames } from '../../services/videoProcessor';

export const VideoToImage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [intervalOption, setIntervalOption] = useState<'1' | '5' | '10' | 'custom'>('1');
  const [customInterval, setCustomInterval] = useState(2);
  const [format, setFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [frames, setFrames] = useState<{ blob: Blob; timestamp: number; url: string }[]>([]);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);

  useObjectUrls(frames.map(frame=>frame.url));

  useEffect(()=>{setZipBlob(null);setFrames([]);},[file,intervalOption,customInterval,format]);

  const handleFile = (files: File[]) => {
    if (!files[0]) return;
    setFile(files[0]);
    setFrames([]);
    setZipBlob(null);
  };

  const runExtraction = async () => {
    if (!file) return;
    setIsExtracting(true);
    setProgress(5);
    setFrames([]);

    try {
      const interval = intervalOption === 'custom' ? customInterval : Number(intervalOption);
      const res = await extractVideoFrames(
        file,
        interval,
        format,
        50,
        (p) => setProgress(p)
      );

      setFrames(res.frames);
      setZipBlob(res.zipBlob || null);
      setIsExtracting(false);
    } catch (e) {
      reportToolError(e);
      setIsExtracting(false);
    }
  };

  const downloadZip = () => {
    if (!zipBlob || !file) return;
    const a = document.createElement('a');
    const downloadUrl = URL.createObjectURL(zipBlob);
    a.href = downloadUrl;
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}_frames.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(downloadUrl),60000);
  };

  return (
    <fieldset disabled={isExtracting} style={{minWidth:0}} className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-500">
          <ImageDown size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Video to Image Frames</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Extract high-definition image frames at regular intervals and bundle into a ZIP.
          </p>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="video/*"
          multiple={false}
          label="Choose video to extract frames"
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{file.name}</span>
            <button
              onClick={() => { setFile(null); setFrames([]); setZipBlob(null); }}
              className="text-xs text-slate-400 hover:text-rose-500"
            >
              Choose different file
            </button>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Extraction Interval:</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: '1', label: 'Every 1s' },
                  { id: '5', label: 'Every 5s' },
                  { id: '10', label: 'Every 10s' },
                  { id: 'custom', label: 'Custom' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setIntervalOption(item.id as any)}
                    className={`rounded-lg px-3 py-1.5 font-bold transition-all ${
                      intervalOption === item.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {intervalOption === 'custom' && (
                <div className="mt-2 flex items-center gap-2">
                  <span>Interval (seconds):</span>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={customInterval}
                    onChange={(e) => setCustomInterval(Number(e.target.value))}
                    className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1 text-center"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Output Format:</label>
              <div className="flex gap-2">
                {(['jpeg', 'png', 'webp'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`rounded-lg px-3.5 py-1.5 font-bold uppercase transition-all ${
                      format === fmt
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {fmt === 'jpeg' ? 'JPG' : fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action */}
          <div>
            {isExtracting ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-indigo-600">
                  <span className="flex items-center gap-1.5">
                    <RotateCw size={14} className="animate-spin" /> Seeking and extracting video frames...
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full bg-indigo-600 transition-all duration-150" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : zipBlob ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Extracted {frames.length} frames successfully!
                </span>
                <button
                  onClick={downloadZip}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs"
                >
                  <Archive size={14} /> Download All as ZIP
                </button>
              </div>
            ) : (
              <button
                onClick={runExtraction}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Extract Frames
              </button>
            )}
          </div>

          {/* Frame thumbnails grid */}
          {frames.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">Preview Extracted Frames ({frames.length}):</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1">
                {frames.map((f, i) => (
                  <div key={i} className="group relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-black aspect-video">
                    <img src={f.url} alt={`Frame ${i}`} className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 left-1 rounded bg-black/80 px-1 text-[9px] font-mono text-white">
                      {f.timestamp.toFixed(1)}s
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </fieldset>
  );
};
