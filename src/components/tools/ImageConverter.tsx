import React, { useEffect, useState } from 'react';
import {
  Image as ImageIcon,
  Download,
  RotateCw,
  CheckCircle2,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { convertImage, loadImageFromFile } from '../../services/imageProcessor';
import { useHistory } from '../../context/HistoryContext';

export const ImageConverter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [targetFormat, setTargetFormat] = useState<'webp' | 'jpeg' | 'png' | 'avif' | 'bmp' | 'ico'>('webp');
  const [quality, setQuality] = useState<number>(90);
  const [resizeMode, setResizeMode] = useState<'original' | 'percentage' | 'custom'>('original');
  const [percentage, setPercentage] = useState<number>(100);
  const [customWidth, setCustomWidth] = useState<number>(1920);
  const [customHeight, setCustomHeight] = useState<number>(1080);
  const [keepAspect, setKeepAspect] = useState<boolean>(true);
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const { addHistoryItem } = useHistory();
  const [error, setError] = useState('');
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl); }, [resultUrl]);
  useEffect(() => { setResultBlob(null); setResultUrl(null); setError(''); }, [targetFormat, quality, resizeMode, percentage, customWidth, customHeight, keepAspect, backgroundColor]);

  const [avifSupported]=useState(()=>document.createElement('canvas').toDataURL('image/avif').startsWith('data:image/avif'));
  const formats = ['WEBP','JPEG','PNG',...(avifSupported?['AVIF']:[]),'BMP','ICO'];

  const handleFile = async (files: File[]) => {
    if (!files[0]) return;
    const f = files[0];
    setError('');
    setDimensions(null);
    setFile(f);
    setResultBlob(null);
    setResultUrl(null);

    const url = URL.createObjectURL(f);
    setPreviewUrl(url);

    try {
      const img = await loadImageFromFile(f);
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setCustomWidth(img.naturalWidth);
      setCustomHeight(img.naturalHeight);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The image could not be processed. Try another file or format.');
    }
  };

  const runConvert = async () => {
    if (!file) return;
    setError('');
    setIsConverting(true);

    try {
      let w = dimensions?.width;
      let h = dimensions?.height;

      if (resizeMode === 'percentage' && dimensions) {
        w = Math.round(dimensions.width * (percentage / 100));
        h = Math.round(dimensions.height * (percentage / 100));
      } else if (resizeMode === 'custom') {
        w = customWidth;
        h = customHeight;
      }

      if(targetFormat==='ico'){w=resizeMode==='original'?64:Math.min(256,w||64);h=w;}
      const res = await convertImage(file, {
        format: targetFormat,
        quality: quality / 100,
        width: w,
        height: h,
        keepAspectRatio: keepAspect,
        backgroundColor: targetFormat === 'jpeg' || targetFormat === 'bmp' ? backgroundColor : undefined,
      });

      const url = URL.createObjectURL(res.blob);
      setResultBlob(res.blob);
      setResultUrl(url);
      setIsConverting(false);

      const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
      addHistoryItem({
        inputFileName: file.name,
        outputFileName: `${file.name.replace(/\.[^/.]+$/, '')}.${ext}`,
        inputSize: file.size,
        outputSize: res.blob.size,
        inputFormat: file.name.split('.').pop()?.toUpperCase() || 'IMAGE',
        outputFormat: targetFormat.toUpperCase(),
        category: 'image',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The image could not be processed. Try another file or format.');
      setIsConverting(false);
    }
  };

  const downloadImage = () => {
    if (!resultBlob || !file) return;
    const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
    const a = document.createElement('a');
    a.href = resultUrl || URL.createObjectURL(resultBlob);
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <fieldset disabled={isConverting} style={{minWidth:0}} className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
          <ImageIcon size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Image Converter</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Convert images with control over quality and dimensions. Available output formats depend on your browser.
          </p>
        </div>
      </div>

      {error && <div role="alert" className="studio-error">{error}</div>}
      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.ico,.avif"
          multiple={false}
          label="Choose image to convert"
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 shadow-xs">
          <div className="flex flex-wrap gap-3 justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="text-xs min-w-0 break-all">
              <span className="font-bold text-slate-900 dark:text-slate-100">{file.name}</span>
              <span className="ml-2 text-slate-500">
                {dimensions ? `${dimensions.width} × ${dimensions.height} px • ` : ''}
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </div>
            <button
              disabled={isConverting}
              onClick={() => { setFile(null); setResultBlob(null); setResultUrl(null); }}
              className="text-xs text-slate-400 hover:text-rose-500"
            >
              Choose different file
            </button>
          </div>

          {/* Image preview & Target Format selector */}
          <fieldset disabled={isConverting} className="grid grid-cols-1 md:grid-cols-3 gap-5 border-0 p-0 min-w-0">
            {/* Preview thumbnail */}
            <div className="flex flex-col items-center justify-center rounded-xl bg-slate-950/20 border border-slate-200 dark:border-slate-800 p-2 max-h-56">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Original"
                  className="max-h-48 max-w-full object-contain rounded"
                />
              )}
            </div>

            {/* Controls */}
            <div className="md:col-span-2 space-y-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Format:</span>
                <div className="flex flex-wrap gap-2">
                  {formats.map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setTargetFormat(fmt.toLowerCase() as any)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                        targetFormat.toUpperCase() === fmt
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Image Quality</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{quality}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              {targetFormat==='ico' && <p className="text-xs text-slate-500">ICO: 64 × 64 secara default; ukuran khusus dibatasi hingga 256 × 256.</p>}
              {!avifSupported && <p className="text-xs text-slate-500">Ekspor AVIF tidak tersedia pada browser ini.</p>}
              {/* Resize Options */}
              <div className="space-y-2 pt-1 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Resize Mode:</span>
                <div className="flex gap-2">
                  {[
                    { id: 'original', label: 'Original' },
                    { id: 'percentage', label: 'Percentage (%)' },
                    { id: 'custom', label: 'Custom Pixels' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setResizeMode(m.id as any)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium border ${
                        resizeMode === m.id
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300'
                          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {resizeMode === 'percentage' && (
                  <div className="flex items-center gap-2 pt-1">
                    <span>Scale Percentage:</span>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      value={percentage}
                      onChange={(e) => setPercentage(Number(e.target.value))}
                      className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1 text-center"
                    />
                    <span>%</span>
                  </div>
                )}

                {resizeMode === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-slate-500">Width (px)</label>
                      <input
                        type="number"
                        value={customWidth}
                        onChange={(e) => {
                          const w = Number(e.target.value);
                          setCustomWidth(w);
                          if (keepAspect && dimensions) setCustomHeight(Math.round((w * dimensions.height) / dimensions.width));
                        }}
                        className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500">Height (px)</label>
                      <input
                        type="number"
                        value={customHeight}
                        onChange={(e) => {
                          const h = Number(e.target.value);
                          setCustomHeight(h);
                          if (keepAspect && dimensions) setCustomWidth(Math.round((h * dimensions.width) / dimensions.height));
                        }}
                        className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </fieldset>

          {/* Action */}
          <div>
            {isConverting ? (
              <div className="flex items-center justify-center p-3 text-xs text-indigo-600 font-bold gap-2">
                <RotateCw size={14} className="animate-spin" /> Encoding image in browser canvas...
              </div>
            ) : resultBlob ? (
              <div className="flex flex-wrap gap-3 items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Image Converted! Output size: {(resultBlob.size / 1024).toFixed(1)} KB (
                  {(((file.size - resultBlob.size) / file.size) * 100).toFixed(0)}% saved)
                </span>
                <button
                  onClick={downloadImage}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs"
                >
                  <Download size={14} /> Download Image
                </button>
              </div>
            ) : (
              <button
                disabled={!dimensions || isConverting}
                onClick={runConvert}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Convert Image Now
              </button>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
};
