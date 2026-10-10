import React from 'react';
import {
  ListOrdered,
  Download,
  RotateCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Play,
  Archive,
  Layers,
} from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { PrivacyIndicator } from '../common/PrivacyIndicator';
import { useQueue } from '../../context/QueueContext';

export const BatchConverter: React.FC = () => {
  const {
    jobs,
    addJobs,
    updateJob,
    removeJob,
    clearAllJobs,
    clearCompletedJobs,
    startJob,
    startAllWaitingJobs,
    cancelJob,
    downloadJobOutput,
    downloadAllCompletedAsZip,
    isProcessingAny,
  } = useQueue();

  const completedCount = jobs.filter((j) => j.status === 'completed').length;
  const waitingCount = jobs.filter((j) => j.status === 'waiting').length;

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / 1024).toFixed(0) + ' KB';
  };

  const getFormatOptions = (category: string) => {
    if (category === 'video') return ['MP4', 'WEBM', 'MKV', 'GIF'];
    if (category === 'audio') return ['MP3', 'WAV', 'AAC', 'OGG', 'OPUS', 'FLAC'];
    if (category === 'image') return ['WEBP', 'JPG', 'PNG', 'AVIF', 'ICO'];
    return ['PDF'];
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
            <ListOrdered size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Batch Converter Studio</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Queue images, audio, and video. Convert and download the results together.
            </p>
          </div>
        </div>

        {jobs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {waitingCount > 0 && (
              <button
                onClick={startAllWaitingJobs}
                disabled={isProcessingAny}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                <Play size={14} /> Start All ({waitingCount})
              </button>
            )}

            {completedCount > 0 && (
              <button
                onClick={downloadAllCompletedAsZip}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition-colors"
              >
                <Archive size={14} /> Download All as ZIP ({completedCount})
              </button>
            )}

            <button
              onClick={clearCompletedJobs}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Clear Completed
            </button>
          </div>
        )}
      </div>

      <PrivacyIndicator />

      <DropZone
        onFilesSelected={(files) => addJobs(files)}
        accept="image/*,audio/*,video/*,.mkv,.flac,.m4a,.avi"
        multiple={true}
        label="Add multiple files to batch queue"
        description="Add images, audio, or video. PDF input is not supported."
        compact={jobs.length > 0}
      />

      {jobs.length > 0 ? (
        <div className="space-y-3">
          {/* Global Queue Progress Bar */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-xs space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-2">
                <Layers size={15} className="text-indigo-600 dark:text-indigo-400" />
                Global Progress: {completedCount} / {jobs.length} files converted
              </span>
              <button onClick={clearAllJobs} className="text-xs text-slate-400 hover:text-rose-500">
                Clear All Queue
              </button>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${jobs.length > 0 ? (completedCount / jobs.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Job Items List */}
          <div className="space-y-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 gap-3 shadow-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                      {job.category}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {job.fileName}
                    </span>
                    <span className="text-[11px] text-slate-400">({formatSize(job.fileSize)})</span>
                  </div>

                  {job.status === 'processing' && (
                    <div className="mt-2 w-full space-y-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full bg-indigo-600 transition-all duration-150"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400">Processing: {job.progress}%</div>
                    </div>
                  )}

                  {job.status === 'failed' && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-rose-500">
                      <AlertCircle size={12} />
                      {job.errorMessage || 'Conversion failed'}
                    </div>
                  )}
                </div>

                {/* Target format select & actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {job.status === 'waiting' && (
                    <select
                      value={job.targetFormat.toUpperCase()}
                      onChange={(e) => updateJob(job.id, { targetFormat: e.target.value.toLowerCase() })}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs font-bold uppercase text-slate-800 dark:text-slate-200"
                    >
                      {getFormatOptions(job.category).map((fmt) => (
                        <option key={fmt} value={fmt}>{fmt}</option>
                      ))}
                    </select>
                  )}

                  {job.status === 'completed' ? (
                    <button
                      onClick={() => downloadJobOutput(job.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      <Download size={13} /> Download
                    </button>
                  ) : job.status === 'processing' ? (
                    <span className="flex items-center gap-1 text-xs text-indigo-500 font-medium">
                      <RotateCw size={12} className="animate-spin" /> Converting...
                    </span>
                  ) : (
                    <button
                      onClick={() => startJob(job.id)}
                      className="rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1 text-xs font-semibold hover:opacity-90"
                    >
                      Convert
                    </button>
                  )}

                  <button
                    onClick={() => removeJob(job.id)}
                    className="p-1 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
