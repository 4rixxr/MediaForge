import React, { useState } from 'react';
import { Zap, Download, RotateCw, CheckCircle2 } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { convertImage } from '../../services/imageProcessor';

export const ImageToWebP: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<number>(85);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const handleFile = (files: File[]) => {
    if (!files[0]) return;
    setFile(files[0]);
    setResultBlob(null);
  };

  const runConvert = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const res = await convertImage(file, {
        format: 'webp',
        quality: quality / 100,
      });

      setResultBlob(res.blob);
      setIsProcessing(false);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  const downloadWebP = () => {
    if (!resultBlob || !file) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultBlob);
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}.webp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
          <Zap size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Fast Image to WebP</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Convert PNG or JPG to next-generation Google WebP format with alpha transparency support.
          </p>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="image/*"
          multiple={false}
          label="Choose image to convert to WebP"
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{file.name}</span>
              <span className="ml-2 text-xs text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
            <button
              onClick={() => { setFile(null); setResultBlob(null); }}
              className="text-xs text-slate-400 hover:text-rose-500"
            >
              Choose different file
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>WebP Compression Quality</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{quality}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <div>
            {isProcessing ? (
              <div className="flex items-center justify-center p-3 text-xs text-indigo-600 font-bold gap-2">
                <RotateCw size={14} className="animate-spin" /> Encoding to WebP...
              </div>
            ) : resultBlob ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> WebP Ready! ({(resultBlob.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  onClick={downloadWebP}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs"
                >
                  <Download size={14} /> Download .WebP
                </button>
              </div>
            ) : (
              <button
                onClick={runConvert}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Convert to WebP
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
