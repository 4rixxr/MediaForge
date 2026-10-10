import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Download, RotateCw, CheckCircle2, ArrowRight } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { ToolId } from '../../types/media';

interface PdfToolsProps {
  onSelectTool: (id: ToolId) => void;
}

export const PdfTools: React.FC<PdfToolsProps> = ({ onSelectTool }) => {
  const [file, setFile] = useState<File | null>(null);

  const handleFile = (files: File[]) => {
    if (!files[0]) return;
    setFile(files[0]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
          <FileSpreadsheet size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">PDF Tools Suite</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create a PDF from images or view basic file information.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button type="button"
          onClick={() => onSelectTool('image-to-pdf')}
          className="group cursor-pointer text-left rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-xs hover:border-indigo-500 transition-all space-y-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              Image to PDF Converter
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Turn multiple JPG, PNG, and WebP pictures into a beautifully formatted PDF with custom margins and page sizes.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span>Launch Image to PDF</span>
            <ArrowRight size={13} />
          </div>
        </button>

        <button type="button"
          onClick={() => onSelectTool('media-info')}
          className="group cursor-pointer text-left rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-xs hover:border-indigo-500 transition-all space-y-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              PDF Inspector & Metadata
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              View basic file details such as name, size, and type.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span>Inspect File</span>
            <ArrowRight size={13} />
          </div>
        </button>
      </div>
    </div>
  );
};
