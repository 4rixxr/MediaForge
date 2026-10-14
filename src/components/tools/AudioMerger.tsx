import {reportToolError} from '../../services/toolErrors';
import React, { useState, useEffect } from 'react';
import { Layers, ArrowUp, ArrowDown, Trash2, Download, RotateCw, CheckCircle2 } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { mergeAudioFiles } from '../../services/audioProcessor';

export const AudioMerger: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  useEffect(()=>{setResultBlob(null);},[files]);

  const handleFiles = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setResultBlob(null);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= files.length) return;
    const copy = [...files];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setFiles(copy);
  };

  const removeItem = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const runMerge = async () => {
    if (files.length === 0) return;
    setIsMerging(true);

    try {
      const res = await mergeAudioFiles(files);
      setResultBlob(res.blob);
      setIsMerging(false);
    } catch (e) {
      reportToolError(e);
      setIsMerging(false);
    }
  };

  const downloadMerged = () => {
    if (!resultBlob) return;
    const a = document.createElement('a');
    const downloadUrl = URL.createObjectURL(resultBlob);
    a.href = downloadUrl;
    a.download = `MediaForge_Merged_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(downloadUrl),60000);
  };

  return (
    <fieldset disabled={isMerging} style={{minWidth:0}} className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
          <Layers size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Audio Merger</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Combine multiple audio tracks in sequence into a single continuous seamless audio file.
          </p>
        </div>
      </div>

      <DropZone
        onFilesSelected={handleFiles}
        accept="audio/*"
        multiple={true}
        label="Add audio tracks to merge"
        description="Drop multiple songs or voice recordings in order"
        compact={files.length > 0}
      />

      {files.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-4 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Tracks to Combine ({files.length})
            </span>
            <button
              onClick={() => { setFiles([]); setResultBlob(null); }}
              className="text-xs text-slate-400 hover:text-rose-500"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-2">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 text-xs"
              >
                <div className="flex items-center gap-3 truncate">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{file.name}</span>
                  <span className="text-slate-400">({(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => moveItem(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 hover:text-indigo-600 disabled:opacity-20"
                    title="Move up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => moveItem(idx, 'down')}
                    disabled={idx === files.length - 1}
                    className="p-1 hover:text-indigo-600 disabled:opacity-20"
                    title="Move down"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 text-slate-400 hover:text-rose-500"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action */}
          <div>
            {isMerging ? (
              <div className="flex items-center justify-center p-3 text-xs text-indigo-600 font-bold gap-2">
                <RotateCw size={14} className="animate-spin" /> Merging audio buffers seamlessly...
              </div>
            ) : resultBlob ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> All Tracks Merged! ({(resultBlob.size / (1024 * 1024)).toFixed(1)} MB)
                </span>
                <button
                  onClick={downloadMerged}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  <Download size={13} /> Download Merged Audio
                </button>
              </div>
            ) : (
              <button
                onClick={runMerge}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Merge All Tracks into One
              </button>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
};
