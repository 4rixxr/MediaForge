import React, { useState } from 'react';
import { FileAudio, Download, RotateCw, CheckCircle2, Music } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { extractAudioFromVideo } from '../../services/videoProcessor';
import { useHistory } from '../../context/HistoryContext';

export const ExtractAudio: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState<'wav' | 'mp3' | 'aac' | 'm4a' | 'ogg'>('mp3');
  const [bitrate, setBitrate] = useState('320');
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const { addHistoryItem } = useHistory();

  const handleFile = (files: File[]) => {
    if (!files[0]) return;
    setFile(files[0]);
    setResultBlob(null);
  };

  const runExtract = async () => {
    if (!file) return;
    setIsExtracting(true);
    setProgress(10);

    try {
      const res = await extractAudioFromVideo(file, (p) => setProgress(p));
      setResultBlob(res.blob);
      setIsExtracting(false);

      addHistoryItem({
        inputFileName: file.name,
        outputFileName: `${file.name.replace(/\.[^/.]+$/, '')}.${targetFormat}`,
        inputSize: file.size,
        outputSize: res.blob.size,
        inputFormat: file.name.split('.').pop()?.toUpperCase() || 'VIDEO',
        outputFormat: targetFormat.toUpperCase(),
        category: 'audio',
      });
    } catch (e) {
      console.error(e);
      setIsExtracting(false);
    }
  };

  const downloadAudio = () => {
    if (!resultBlob || !file) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultBlob);
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}.${targetFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
          <FileAudio size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Extract Audio from Video</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rip crystal-clear uncompressed audio tracks directly out of any video container.
          </p>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="video/*"
          multiple={false}
          label="Choose video to extract audio track"
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{file.name}</span>
            <button
              onClick={() => { setFile(null); setResultBlob(null); }}
              className="text-xs text-slate-400 hover:text-rose-500"
            >
              Choose different file
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Target Audio Format:</label>
              <div className="flex flex-wrap gap-2">
                {(['mp3', 'wav', 'aac', 'm4a', 'ogg'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setTargetFormat(fmt)}
                    className={`rounded-lg px-3 py-1.5 font-bold uppercase transition-all ${
                      targetFormat === fmt
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Audio Quality / Bitrate:</label>
              <select
                value={bitrate}
                onChange={(e) => setBitrate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-slate-100"
              >
                <option value="320">320 kbps (Studio Master Quality)</option>
                <option value="256">256 kbps (High Fidelity)</option>
                <option value="192">192 kbps (Standard Audio)</option>
                <option value="128">128 kbps (Voice / Podcast)</option>
              </select>
            </div>
          </div>

          {/* Action */}
          <div>
            {isExtracting ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-indigo-600">
                  <span className="flex items-center gap-1.5">
                    <RotateCw size={14} className="animate-spin" /> Decoding audio stream in browser...
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full bg-indigo-600 transition-all duration-150" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : resultBlob ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Audio Extracted Successfully! ({(resultBlob.size / (1024 * 1024)).toFixed(1)} MB)
                </span>
                <button
                  onClick={downloadAudio}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs"
                >
                  <Download size={14} /> Download {targetFormat.toUpperCase()}
                </button>
              </div>
            ) : (
              <button
                onClick={runExtract}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Extract Audio Track Now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
