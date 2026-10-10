import React, { useState } from 'react';
import { ArrowLeftRight, ArrowRight, Download, RotateCw, CheckCircle2 } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { useQueue } from '../../context/QueueContext';
import { ToolId } from '../../types/media';

interface FileConverterProps {
  onSelectTool: (id: ToolId) => void;
}

export const FileConverter: React.FC<FileConverterProps> = ({ onSelectTool }) => {
  const { addJobs } = useQueue();

  const handleFiles = (files: File[]) => {
    if (!files[0]) return;
    addJobs(files);
    onSelectTool('batch-converter');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
          <ArrowLeftRight size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add files to your queue</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Add media files, then choose an output format in the queue.
          </p>
        </div>
      </div>

      <DropZone
        onFilesSelected={handleFiles}
        accept="image/*,audio/*,video/*,.mkv,.flac,.m4a,.avi"
        multiple={true}
        label="Choose media files"
        description="Images, audio, and video • choose output settings in the next step"
      />

      {/* Format Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-4">
        {[
          { title: 'Video Formats', list: 'MP4, WebM, MKV, MOV, GIF, AVI, TS' },
          { title: 'Audio Formats', list: 'MP3, WAV, AAC, FLAC, OGG, Opus, M4A' },
          { title: 'Image Formats', list: 'WebP, JPG, PNG, AVIF, ICO, BMP, SVG' },
          
        ].map((box, i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-200">{box.title}</div>
            <div className="text-[11px] text-slate-400">{box.list}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
