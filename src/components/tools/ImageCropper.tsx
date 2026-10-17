import {reportToolError} from '../../services/toolErrors';
import React, { useState, useEffect } from 'react';
import { Crop, Download, RotateCw, CheckCircle2 } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { cropImage, loadImageFromFile } from '../../services/imageProcessor';

export const ImageCropper: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [naturalDims, setNaturalDims] = useState<{ width: number; height: number } | null>(null);
  const [aspect, setAspect] = useState<'1:1' | '16:9' | '4:3' | '3:2' | 'free'>('1:1');
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 400, height: 400 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  useEffect(()=>{setResultBlob(null);},[file,cropRect]);

  useEffect(()=>()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);},[previewUrl]);

  const handleFile = async (files: File[]) => {
    if (!files[0]) return;
    const f = files[0];
    setFile(f);
    setResultBlob(null);

    const img = await loadImageFromFile(f);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNaturalDims({ width: w, height: h });
    setCropRect({ x: 0, y: 0, width: Math.min(w, h), height: Math.min(w, h) });
    setPreviewUrl(URL.createObjectURL(f));
  };

  const setCropAspect = (asp: '1:1' | '16:9' | '4:3' | '3:2' | 'free') => {
    setAspect(asp);
    if (!naturalDims) return;
    const maxW = naturalDims.width;
    const maxH = naturalDims.height;
    let targetW = cropRect.width;
    let targetH = cropRect.height;

    if (asp === '1:1') {
      const side = Math.min(maxW, maxH);
      targetW = side;
      targetH = side;
    } else if (asp === '16:9') {
      targetH = Math.min(maxH, Math.round((maxW * 9) / 16));
      targetW = Math.round((targetH * 16) / 9);
    } else if (asp === '4:3') {
      targetH = Math.min(maxH, Math.round((maxW * 3) / 4));
      targetW = Math.round((targetH * 4) / 3);
    } else if (asp === '3:2') {
      targetH = Math.min(maxH, Math.round((maxW * 2) / 3));
      targetW = Math.round((targetH * 3) / 2);
    }

    setCropRect({ x: 0, y: 0, width: targetW, height: targetH });
  };

  const runCrop = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const blob = await cropImage(file, cropRect, 'png');
      setResultBlob(blob);
      setIsProcessing(false);
    } catch (e) {
      reportToolError(e);
      setIsProcessing(false);
    }
  };

  const downloadCropped = () => {
    if (!resultBlob || !file) return;
    const a = document.createElement('a');
    const downloadUrl = URL.createObjectURL(resultBlob);
    a.href = downloadUrl;
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}_cropped.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(downloadUrl),60000);
  };

  return (
    <fieldset disabled={isProcessing} style={{minWidth:0}} className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
          <Crop size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Image Cropper</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cut and frame photos with standard social media aspect ratios.
          </p>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="image/*"
          multiple={false}
          label="Choose image to crop"
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{file.name}</span>
            <button
              onClick={() => { setFile(null); setResultBlob(null); setPreviewUrl(null); }}
              className="text-xs text-slate-400 hover:text-rose-500"
            >
              Choose different file
            </button>
          </div>

          {/* Aspect Presets */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Preset Ratio:</span>
            {(['1:1', '16:9', '4:3', '3:2', 'free'] as const).map((asp) => (
              <button
                key={asp}
                onClick={() => setCropAspect(asp)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  aspect === asp
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {asp}
              </button>
            ))}
          </div>

          {/* Preview Image */}
          {previewUrl && (
            <div className="flex items-center justify-center rounded-xl bg-slate-950/20 border border-slate-200 dark:border-slate-800 p-2 max-h-72 overflow-hidden">
              <img src={previewUrl} alt="Preview" className="max-h-64 object-contain rounded" />
            </div>
          )}

          {/* Dimensions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-slate-500">X Offset (px)</label>
              <input
                type="number"
                value={cropRect.x}
                onChange={(e) => setCropRect({ ...cropRect, x: Number(e.target.value) })}
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
              />
            </div>
            <div>
              <label className="text-slate-500">Y Offset (px)</label>
              <input
                type="number"
                value={cropRect.y}
                onChange={(e) => setCropRect({ ...cropRect, y: Number(e.target.value) })}
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
              />
            </div>
            <div>
              <label className="text-slate-500">Width (px)</label>
              <input
                type="number"
                value={cropRect.width}
                onChange={(e) => setCropRect({ ...cropRect, width: Number(e.target.value) })}
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
              />
            </div>
            <div>
              <label className="text-slate-500">Height (px)</label>
              <input
                type="number"
                value={cropRect.height}
                onChange={(e) => setCropRect({ ...cropRect, height: Number(e.target.value) })}
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
              />
            </div>
          </div>

          {/* Action */}
          <div>
            {isProcessing ? (
              <div className="flex items-center justify-center p-3 text-xs text-indigo-600 font-bold gap-2">
                <RotateCw size={14} className="animate-spin" /> Cropping image...
              </div>
            ) : resultBlob ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Cropped Image Ready!
                </span>
                <button
                  onClick={downloadCropped}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs"
                >
                  <Download size={14} /> Download Cropped Image
                </button>
              </div>
            ) : (
              <button
                onClick={runCrop}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Crop Image
              </button>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
};
