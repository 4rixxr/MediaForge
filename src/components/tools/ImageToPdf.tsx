import {useObjectUrls} from '../../services/useObjectUrls';
import {reportToolError} from '../../services/toolErrors';
import React, { useState, useEffect } from 'react';
import {
  FileText,
  RotateCw,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { convertImagesToPdf, ImageToPdfItem, PdfExportOptions } from '../../services/pdfProcessor';
import { useHistory } from '../../context/HistoryContext';

export const ImageToPdf: React.FC = () => {
  const [items, setItems] = useState<ImageToPdfItem[]>([]);
  const [pageSize, setPageSize] = useState<'a4' | 'a5' | 'letter' | 'legal' | 'original'>('a4');
  const [orientation, setOrientation] = useState<'p' | 'l' | 'auto'>('auto');
  const [marginMm, setMarginMm] = useState<number>(5);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const { addHistoryItem } = useHistory();

  useObjectUrls(items.map(item=>item.previewUrl));

  useEffect(()=>{setPdfBlob(null);},[items,pageSize,orientation,marginMm]);

  const handleFiles = (files: File[]) => {
    const newItems: ImageToPdfItem[] = files.map((file) => ({
      id: 'pdf-img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      file,
      previewUrl: URL.createObjectURL(file),
      rotation: 0,
    }));
    setItems((prev) => [...prev, ...newItems]);
    setPdfBlob(null);
  };

  const rotateItem = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, rotation: (it.rotation + 90) % 360 } : it))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const copy = [...items];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setItems(copy);
  };

  const runExport = async () => {
    if (items.length === 0) return;
    setIsExporting(true);
    setProgress(10);

    try {
      const blob = await convertImagesToPdf(
        items,
        {
          pageSize,
          orientation,
          marginMm,
          imageFit: 'contain',
        },
        (p) => setProgress(p)
      );

      setPdfBlob(blob);
      setIsExporting(false);

      const totalSize = items.reduce((acc, it) => acc + it.file.size, 0);
      addHistoryItem({
        inputFileName: `${items.length} images`,
        outputFileName: `MediaForge_Document_${Date.now()}.pdf`,
        inputSize: totalSize,
        outputSize: blob.size,
        inputFormat: 'IMAGES',
        outputFormat: 'PDF',
        category: 'document',
      });
    } catch (e) {
      reportToolError(e);
      setIsExporting(false);
    }
  };

  const downloadPdf = () => {
    if (!pdfBlob) return;
    const a = document.createElement('a');
    const downloadUrl = URL.createObjectURL(pdfBlob);
    a.href = downloadUrl;
    a.download = `MediaForge_Document_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(downloadUrl),60000);
  };

  return (
    <fieldset disabled={isExporting} style={{minWidth:0}} className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
          <FileText size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Image to PDF Converter</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Combine multiple pictures into a clean printable multi-page PDF document.
          </p>
        </div>
      </div>

      <DropZone
        onFilesSelected={handleFiles}
        accept="image/*"
        multiple={true}
        label="Add images to convert to PDF"
        description="Select multiple photos, screenshots or document scans (JPG, PNG, WebP)"
        compact={items.length > 0}
      />

      {items.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 shadow-xs">
          {/* Settings Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Page Size</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
              >
                <option value="a4">A4 (Standard ISO)</option>
                <option value="a5">A5 (Compact)</option>
                <option value="letter">US Letter</option>
                <option value="legal">US Legal</option>
                <option value="original">Fit Image Size</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Orientation</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
              >
                <option value="auto">Auto (Match Image)</option>
                <option value="p">Portrait</option>
                <option value="l">Landscape</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Page Margin</label>
              <select
                value={marginMm}
                onChange={(e) => setMarginMm(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
              >
                <option value={0}>No Margin (Borderless)</option>
                <option value={5}>Small (5mm)</option>
                <option value={15}>Normal (15mm)</option>
                <option value={25}>Large (25mm)</option>
              </select>
            </div>
          </div>

          {/* Grid of reorderable images */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Pages / Images ({items.length})</span>
              <button
                onClick={() => { setItems([]); setPdfBlob(null); }}
                className="hover:text-rose-500"
              >
                Remove All
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-1">
              {items.map((it, idx) => (
                <div
                  key={it.id}
                  className="group relative flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-2 shadow-xs"
                >
                  <div className="relative aspect-3/4 overflow-hidden rounded-lg bg-black/5 flex items-center justify-center">
                    <img
                      src={it.previewUrl}
                      alt={it.file.name}
                      style={{ transform: `rotate(${it.rotation}deg)` }}
                      className="max-h-full max-w-full object-contain transition-transform duration-200"
                    />
                    <span className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/80 text-[10px] font-bold text-white">
                      {idx + 1}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[80px]">
                      {it.file.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => rotateItem(it.id)}
                        className="p-1 text-slate-400 hover:text-indigo-600"
                        title="Rotate 90 deg"
                      >
                        <RotateCw size={13} />
                      </button>
                      <button
                        onClick={() => moveItem(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        onClick={() => removeItem(it.id)}
                        className="p-1 text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action */}
          <div>
            {isExporting ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-indigo-600">
                  <span className="flex items-center gap-1.5">
                    <RotateCw size={14} className="animate-spin" /> Compiling PDF pages with jsPDF...
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full bg-indigo-600 transition-all duration-150" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : pdfBlob ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> PDF Created! ({(pdfBlob.size / 1024).toFixed(0)} KB)
                </span>
                <button
                  onClick={downloadPdf}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs"
                >
                  <Download size={14} /> Download PDF
                </button>
              </div>
            ) : (
              <button
                onClick={runExport}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Create PDF Document
              </button>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
};
