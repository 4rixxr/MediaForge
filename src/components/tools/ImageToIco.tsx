import {reportToolError} from '../../services/toolErrors';
import React, { useState, useEffect } from 'react';
import { Sparkles, Download, RotateCw, CheckCircle2 } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { createIco } from '../../services/imageProcessor';

export const ImageToIco: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [icoSize, setIcoSize] = useState<number>(64);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  useEffect(()=>{setResultBlob(null);},[file,icoSize]);

  const handleFile = (files: File[]) => {
    if (!files[0]) return;
    setFile(files[0]);
    setResultBlob(null);
  };

  const runConvert = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const blob = await createIco(file, icoSize);
      setResultBlob(blob);
      setIsProcessing(false);
    } catch (e) {
      reportToolError(e);
      setIsProcessing(false);
    }
  };

  const downloadIco = () => {
    if (!resultBlob || !file) return;
    const a = document.createElement('a');
    const downloadUrl = URL.createObjectURL(resultBlob);
    a.href = downloadUrl;
    a.download = `favicon_${icoSize}x${icoSize}.ico`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(downloadUrl),60000);
  };

  return (
    <fieldset disabled={isProcessing} style={{minWidth:0}} className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
          <Sparkles size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Image to ICO / Favicon</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generate Windows icon binaries and web browser favicon (.ico) files.
          </p>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="image/*"
          multiple={false}
          label="Choose logo or image for ICO"
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{file.name}</span>
            <button
              onClick={() => { setFile(null); setResultBlob(null); }}
              className="text-xs text-slate-400 hover:text-rose-500"
            >
              Choose different file
            </button>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Icon Dimensions:</span>
            <div className="flex gap-2">
              {[
                { size: 16, label: '16×16 (Browser Tab)' },
                { size: 32, label: '32×32 (Standard)' },
                { size: 48, label: '48×48 (Windows App)' },
                { size: 64, label: '64×64 (High-DPI Favicon)' },
                { size: 128, label: '128×128 (Desktop)' },
              ].map((item) => (
                <button
                  key={item.size}
                  onClick={() => setIcoSize(item.size)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    icoSize === item.size
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            {isProcessing ? (
              <div className="flex items-center justify-center p-3 text-xs text-indigo-600 font-bold gap-2">
                <RotateCw size={14} className="animate-spin" /> Packaging binary ICO header...
              </div>
            ) : resultBlob ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Generated favicon.ico ({icoSize}×{icoSize} px)!
                </span>
                <button
                  onClick={downloadIco}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs"
                >
                  <Download size={14} /> Download .ICO
                </button>
              </div>
            ) : (
              <button
                onClick={runConvert}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Generate .ICO File
              </button>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
};
