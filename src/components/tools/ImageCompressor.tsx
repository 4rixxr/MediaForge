import {reportToolError} from '../../services/toolErrors';
import React, { useState, useEffect } from 'react';
import { Shrink, Download, RotateCw, CheckCircle2 } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { ComparisonSlider } from '../common/ComparisonSlider';
import { convertImage } from '../../services/imageProcessor';
import { useHistory } from '../../context/HistoryContext';

export const ImageCompressor: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState<number>(75);
  const [format, setFormat] = useState<'webp' | 'jpeg'>('webp');
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const { addHistoryItem } = useHistory();

  useEffect(()=>()=>{if(originalUrl)URL.revokeObjectURL(originalUrl);},[originalUrl]);
  useEffect(()=>()=>{if(compressedUrl)URL.revokeObjectURL(compressedUrl);},[compressedUrl]);
  const handleFile = async (files: File[]) => {
    if (!files[0]) return;
    const f = files[0];
    setFile(f);
    const url = URL.createObjectURL(f);
    setOriginalUrl(url);
    setCompressedBlob(null);
    setCompressedUrl(null);
  };

  // Re-compress when quality or format changes
  useEffect(() => {
    setCompressedBlob(null);setCompressedUrl(null);
    if (!file) return;
    setIsCompressing(true);
    let isMounted = true;
    const compress = async () => {
      setIsCompressing(true);
      try {
        const res = await convertImage(file, {
          format,
          quality: quality / 100,
        });

        if (isMounted) {
          const url = URL.createObjectURL(res.blob);
          setCompressedBlob(res.blob);
          setCompressedUrl(url);
          setIsCompressing(false);
        }
      } catch (e) {
        reportToolError(e);
        if (isMounted) setIsCompressing(false);
      }
    };

    const timer = setTimeout(compress, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [file, quality, format]);

  const originalSize = file ? file.size : 0;
  const compressedSize = compressedBlob ? compressedBlob.size : 0;
  const reductionPercent = Math.round(((originalSize - compressedSize) / (originalSize || 1)) * 100);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  const handleDownload = () => {
    if (!compressedBlob || !file) return;
    const ext = format === 'jpeg' ? 'jpg' : 'webp';
    const a = document.createElement('a');
    a.href = compressedUrl || URL.createObjectURL(compressedBlob);
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}_compressed.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addHistoryItem({
      inputFileName: file.name,
      outputFileName: `${file.name.replace(/\.[^/.]+$/, '')}_compressed.${ext}`,
      inputSize: file.size,
      outputSize: compressedBlob.size,
      inputFormat: file.name.split('.').pop()?.toUpperCase() || 'IMAGE',
      outputFormat: format.toUpperCase(),
      category: 'image',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-500">
          <Shrink size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Image Compressor</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Smart visual image compression with before/after comparison slider.
          </p>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="image/*"
          multiple={false}
          label="Choose image to compress"
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{file.name}</span>
            <button
              onClick={() => { setFile(null); setOriginalUrl(null); setCompressedBlob(null); }}
              className="text-xs text-slate-400 hover:text-rose-500"
            >
              Choose different file
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-200/80 dark:border-slate-800 text-center">
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-medium">Original Size</div>
              <div className="mt-1 text-base font-bold text-slate-800 dark:text-slate-200">{formatSize(originalSize)}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-medium">Compressed Size</div>
              <div className="mt-1 text-base font-bold text-indigo-600 dark:text-indigo-400">{compressedBlob?formatSize(compressedSize):'—'}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-medium">Savings</div>
              <div className="mt-1 text-base font-bold text-emerald-500">{!compressedBlob?'—':reductionPercent>=0?`${reductionPercent}% lebih kecil`:`${-reductionPercent}% lebih besar`}</div>
            </div>
          </div>

          {/* Before / After Slider */}
          {originalUrl && compressedUrl && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Interactive Comparison (Drag divider left/right)</span>
                {isCompressing && (
                  <span className="flex items-center gap-1 text-indigo-500 font-semibold">
                    <RotateCw size={12} className="animate-spin" /> Updating...
                  </span>
                )}
              </div>
              <ComparisonSlider
                originalUrl={originalUrl}
                compressedUrl={compressedUrl}
                originalLabel={`Original (${formatSize(originalSize)})`}
                compressedLabel={`Compressed (${formatSize(compressedSize)})`}
              />
            </div>
          )}

          {/* Compression Slider & Format */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Compression Quality</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">{quality}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="95"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Compress to Format:</span>
              <div className="flex gap-2">
                {(['webp', 'jpeg'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`rounded-lg px-3 py-1 font-bold uppercase transition-all ${
                      format === fmt
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {fmt === 'jpeg' ? 'JPG' : fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Download Action */}
          <div className="pt-2">
            <button
              onClick={handleDownload}
              disabled={!compressedBlob || isCompressing}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              <Download size={14} /> Download Compressed Image ({formatSize(compressedSize)})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
