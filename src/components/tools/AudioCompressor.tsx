import React, { useState, useEffect } from 'react';
import { VolumeX, Download, RotateCw, CheckCircle2 } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { convertAudio, decodeAudioFile } from '../../services/audioProcessor';

export const AudioCompressor: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [preset, setPreset] = useState<'high' | 'balanced' | 'small'>('balanced');
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error,setError]=useState('');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  useEffect(()=>{setResultBlob(null);setError('');},[file,preset]);

  const handleFile = async (files: File[]) => {
    if (!files[0]) return;
    const f = files[0];
    setFile(f);setDuration(0);setError('');
    setResultBlob(null);

    try {
      const buf = await decodeAudioFile(f);
      setDuration(buf.duration);
    } catch (e) {
      setError(e instanceof Error?e.message:String(e));
    }
  };

  const getTargetBitrate = () => {
    if (preset === 'high') return 192;
    if (preset === 'balanced') return 128;
    return 64; // small
  };

  const origSizeMb = file ? file.size / (1024 * 1024) : 0;
  const estimatedSizeMb = duration>0?duration*getTargetBitrate()*1000/8/1024**2:0;
  const getEstimatedSavings=()=>origSizeMb&&estimatedSizeMb?Math.round((1-estimatedSizeMb/origSizeMb)*100):0;

  const runCompress = async () => {
    if (!file) return;
    setError('');setIsCompressing(true);
    setProgress(15);

    try {
      const res = await convertAudio(
        file,
        {
          format: 'opus',
          bitrate: getTargetBitrate(),
          channels: preset === 'small' ? 1 : 2,
        },
        (p) => setProgress(p)
      );

      setResultBlob(res.blob);
      setIsCompressing(false);
    } catch (e) {
      setError(e instanceof Error?e.message:String(e));
      setIsCompressing(false);
    }
  };

  const downloadAudio = () => {
    if (!resultBlob || !file) return;
    const a = document.createElement('a');
    const downloadUrl = URL.createObjectURL(resultBlob);
    a.href = downloadUrl;
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}_compressed.opus`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(downloadUrl),60000);
  };

  return (
    <fieldset disabled={isCompressing} style={{minWidth:0}} className="max-w-4xl mx-auto space-y-6 pb-12">{error&&<p className="studio-notice" role="alert">{error}</p>}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
          <VolumeX size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Audio Compressor</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Shrink audio podcast and speech recordings using modern Opus and sample-rate downsampling.
          </p>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="audio/*"
          multiple={false}
          label="Choose audio file to compress"
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{file.name}</span>
              <span className="ml-2 text-xs text-slate-500">({origSizeMb.toFixed(2)} MB • {Math.round(duration)}s)</span>
            </div>
            <button
              onClick={() => { setFile(null); setResultBlob(null); }}
              className="text-xs text-slate-400 hover:text-rose-500"
            >
              Choose different file
            </button>
          </div>

          {/* Size Reduction Cards */}
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-200/80 dark:border-slate-800 text-center">
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-medium">Original</div>
              <div className="mt-1 text-base font-bold text-slate-800 dark:text-slate-200">{origSizeMb.toFixed(2)} MB</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-medium">Target Size</div>
              <div className="mt-1 text-base font-bold text-indigo-600 dark:text-indigo-400">{estimatedSizeMb?'~'+estimatedSizeMb.toFixed(2)+' MB':'Belum diketahui'}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-medium">Saving</div>
              <div className="mt-1 text-base font-bold text-emerald-500">{duration>0?'~'+getEstimatedSavings()+'%':'—'}</div>
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Compression Profile:</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'high', label: 'High Fidelity', sub: 'Target 192 kbps stereo' },
                { id: 'balanced', label: 'Balanced', sub: 'Target 128 kbps stereo' },
                { id: 'small', label: 'Maximum Compression', sub: 'Target 64 kbps mono' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id as any)}
                  className={`rounded-xl p-3 text-left transition-all ${
                    preset === p.id
                      ? 'border-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="text-xs font-bold">{p.label}</div>
                  <div className="text-[10px] opacity-75">{p.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Action */}
          <div>
            {isCompressing ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-indigo-600">
                  <span className="flex items-center gap-1.5">
                    <RotateCw size={14} className="animate-spin" /> Compressing audio track...
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
                  <CheckCircle2 size={16} /> Audio Compressed Successfully! ({(resultBlob.size / 1024).toFixed(0)} KB)
                </span>
                <button
                  onClick={downloadAudio}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs"
                >
                  <Download size={14} /> Download Audio
                </button>
              </div>
            ) : (
              <button
                onClick={runCompress}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Compress Audio
              </button>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
};
