import {reportToolError} from '../../services/toolErrors';
import React, { useState, useEffect } from 'react';
import { Scaling, Download, RotateCw, CheckCircle2 } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { convertImage, loadImageFromFile } from '../../services/imageProcessor';

export const ImageResizer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [targetWidth, setTargetWidth] = useState<number>(1920);
  const [targetHeight, setTargetHeight] = useState<number>(1080);
  const [keepAspect, setKeepAspect] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  useEffect(()=>{setResultBlob(null);},[file,targetWidth,targetHeight,keepAspect]);

  const handleFile = async (files: File[]) => {
    if (!files[0]) return;
    const f = files[0];
    setFile(f);
    setResultBlob(null);

    const img = await loadImageFromFile(f);
    setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    setTargetWidth(img.naturalWidth);
    setTargetHeight(img.naturalHeight);
  };

  const setPreset = (scale: number) => {
    if (!dimensions) return;
    const w = Math.round(dimensions.width * scale);
    const h = Math.round(dimensions.height * scale);
    setTargetWidth(w);
    setTargetHeight(h);
  };

  const runResize = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const res = await convertImage(file, {
        format: 'png',
        width: targetWidth,
        height: targetHeight,
        keepAspectRatio: keepAspect,
      });

      setResultBlob(res.blob);
      setIsProcessing(false);
    } catch (e) {
      reportToolError(e);
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!resultBlob || !file) return;
    const a = document.createElement('a');
    const downloadUrl = URL.createObjectURL(resultBlob);
    a.href = downloadUrl;
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}_${targetWidth}x${targetHeight}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(downloadUrl),60000);
  };

  return (
    <fieldset disabled={isProcessing} style={{minWidth:0}} className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
          <Scaling size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Image Resizer</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enlarge or downscale image pixels with high-grade bicubic canvas interpolation.
          </p>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="image/*"
          multiple={false}
          label="Choose image to resize"
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{file.name}</span>
              <span className="ml-2 text-xs text-slate-500">
                Original: {dimensions?.width} × {dimensions?.height} px
              </span>
            </div>
            <button
              onClick={() => { setFile(null); setResultBlob(null); }}
              className="text-xs text-slate-400 hover:text-rose-500"
            >
              Choose different file
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Quick Scale:</span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '25%', scale: 0.25 },
                { label: '50%', scale: 0.5 },
                { label: '75%', scale: 0.75 },
                { label: 'Original', scale: 1.0 },
                { label: '150%', scale: 1.5 },
                { label: '200%', scale: 2.0 },
              ].map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPreset(p.scale)}
                  className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Manual inputs */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-500 mb-1">Target Width (px)</label>
              <input
                type="number"
                value={targetWidth}
                onChange={(e) => {
                  const w = Number(e.target.value);
                  setTargetWidth(w);
                  if (keepAspect && dimensions) {
                    setTargetHeight(Math.round((w * dimensions.height) / dimensions.width));
                  }
                }}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Target Height (px)</label>
              <input
                type="number"
                value={targetHeight}
                onChange={(e) => {
                  const h = Number(e.target.value);
                  setTargetHeight(h);
                  if (keepAspect && dimensions) {
                    setTargetWidth(Math.round((h * dimensions.width) / dimensions.height));
                  }
                }}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
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
            <span>Maintain aspect ratio</span>
          </label>

          {/* Action */}
          <div>
            {isProcessing ? (
              <div className="flex items-center justify-center p-3 text-xs text-indigo-600 font-bold gap-2">
                <RotateCw size={14} className="animate-spin" /> Resizing canvas...
              </div>
            ) : resultBlob ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Resized Successfully ({targetWidth} × {targetHeight})
                </span>
                <button
                  onClick={downloadImage}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs"
                >
                  <Download size={14} /> Download Resized Image
                </button>
              </div>
            ) : (
              <button
                onClick={runResize}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Resize Image
              </button>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
};
