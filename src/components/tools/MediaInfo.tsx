import React, { useState } from 'react';
import { Info, FileCode, CheckCircle2, Copy } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { inspectMediaFile } from '../../services/mediaMetadata';
import { MediaMetadata } from '../../types/media';

export const MediaInfo: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFile = async (files: File[]) => {
    if (!files[0]) return;
    const f = files[0];
    setFile(f);

    const meta = await inspectMediaFile(f);
    setMetadata(meta);
  };

  const copyAsJson = () => {
    if (!metadata) return;
    navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB (${bytes.toLocaleString()} bytes)`;
    return `${(bytes / 1024).toFixed(1)} KB (${bytes.toLocaleString()} bytes)`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
          <Info size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Media Information Inspector</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Deep dive into media containers, stream codecs, dimensions, bitrates, and audio specifications.
          </p>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="*/*"
          multiple={false}
          label="Choose any media file to inspect"
          description="Drop video, audio track, image or document"
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{file.name}</span>
              <span className="ml-2 text-xs text-slate-500">({formatSize(file.size)})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyAsJson}
                className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Copy size={12} />
                <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
              </button>
              <button
                onClick={() => { setFile(null); setMetadata(null); }}
                className="text-xs text-slate-400 hover:text-rose-500"
              >
                Inspect another
              </button>
            </div>
          </div>

          {metadata && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3.5 space-y-2.5">
                <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                  General File Info
                </div>
                <div className="space-y-1.5 font-mono text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Filename:</span>
                    <span className="truncate max-w-[200px]">{metadata.fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">MIME Type:</span>
                    <span>{metadata.fileType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">File Size:</span>
                    <span>{formatSize(metadata.fileSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Last Modified:</span>
                    <span>{metadata.lastModified ? new Date(metadata.lastModified).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3.5 space-y-2.5">
                <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                  Stream & Quality Specs
                </div>
                <div className="space-y-1.5 font-mono text-slate-600 dark:text-slate-400">
                  {metadata.duration !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Duration:</span>
                      <span>{metadata.duration.toFixed(2)} seconds</span>
                    </div>
                  )}
                  {metadata.width && metadata.height && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Resolution:</span>
                      <span>{metadata.width} × {metadata.height} px ({metadata.aspectRatio})</span>
                    </div>
                  )}
                  {metadata.videoCodec && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Video Codec:</span>
                      <span>{metadata.videoCodec}</span>
                    </div>
                  )}
                  {metadata.audioCodec && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Audio Codec:</span>
                      <span>{metadata.audioCodec}</span>
                    </div>
                  )}
                  {metadata.audioChannels !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Audio Channels:</span>
                      <span>{metadata.audioChannels === 2 ? 'Stereo (2ch)' : 'Mono (1ch)'}</span>
                    </div>
                  )}
                  {metadata.sampleRate !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Sample Rate:</span>
                      <span>{metadata.sampleRate} Hz</span>
                    </div>
                  )}
                  {metadata.bitrate !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Bitrate:</span>
                      <span>~{Math.round(metadata.bitrate / 1000)} kbps</span>
                    </div>
                  )}
                  {metadata.colorSpace && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Color Profile:</span>
                      <span>{metadata.colorSpace}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
