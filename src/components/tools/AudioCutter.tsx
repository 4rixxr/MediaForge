import {reportToolError} from '../../services/toolErrors';
import React, { useState, useRef, useEffect } from 'react';
import { Sliders, Play, Pause, Download, RotateCw, CheckCircle2 } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { cutAudio, decodeAudioFile, audioBufferToWav } from '../../services/audioProcessor';

export const AudioCutter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(()=>{setResultBlob(null);},[file,startTime,endTime]);

  useEffect(()=>()=>{if(audioUrl)URL.revokeObjectURL(audioUrl);},[audioUrl]);

  const handleFile = async (files: File[]) => {
    if (!files[0]) return;
    const f = files[0];
    setFile(f);
    setResultBlob(null);

    const buf = await decodeAudioFile(f);
    const dur = buf.duration;
    setDuration(dur);
    setStartTime(0);
    setEndTime(dur);
    setCurrentTime(0);
    setAudioUrl(URL.createObjectURL(audioBufferToWav(buf)));
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      setCurrentTime(cur);
      if (cur >= endTime) {
        audioRef.current.pause();
        setIsPlaying(false);
        audioRef.current.currentTime = startTime;
      }
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current.currentTime < startTime || audioRef.current.currentTime >= endTime) {
        audioRef.current.currentTime = startTime;
      }
      audioRef.current.play().then(()=>setIsPlaying(true)).catch(reportToolError);
    }
  };

  const runCut = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const res = await cutAudio(file, startTime, endTime);
      setResultBlob(res.blob);
      setIsProcessing(false);
    } catch (e) {
      reportToolError(e);
      setIsProcessing(false);
    }
  };

  const downloadCut = () => {
    if (!resultBlob || !file) return;
    const a = document.createElement('a');
    const downloadUrl = URL.createObjectURL(resultBlob);
    a.href = downloadUrl;
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}_cut.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(downloadUrl),60000);
  };

  return (
    <fieldset disabled={isProcessing} style={{minWidth:0}} className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
          <Sliders size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Audio Cutter</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Trim songs, create ringtones, and slice voice recordings with exact start and end markers.
          </p>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="audio/*"
          multiple={false}
          label="Choose audio to trim"
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{file.name}</span>
              <span className="ml-2 text-xs text-slate-500 font-mono">({formatSeconds(duration)})</span>
            </div>
            <button
              onClick={() => { setFile(null); setAudioUrl(null); setResultBlob(null); }}
              className="text-xs text-slate-400 hover:text-rose-500"
            >
              Choose different file
            </button>
          </div>

          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}

          {/* Timeline and Waveform Container */}
          <div className="space-y-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-200/80 dark:border-slate-800">
            {/* Fake decorative audio waveform bars */}
            <div className="flex items-center justify-between h-14 px-2 gap-0.5 opacity-80">
              {Array.from({ length: 60 }).map((_, i) => {
                const height = Math.sin(i * 0.4) * 20 + 24;
                const isInsideSelection =
                  (i / 60) * duration >= startTime && (i / 60) * duration <= endTime;
                return (
                  <div
                    key={i}
                    style={{ height: `${height}px` }}
                    className={`w-1 rounded-full transition-all ${
                      isInsideSelection
                        ? 'bg-indigo-600 dark:bg-indigo-400'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono text-slate-500">
                <span>Start: {formatSeconds(startTime)}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Current: {formatSeconds(currentTime)}</span>
                <span>End: {formatSeconds(endTime)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.05"
                value={currentTime}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentTime(val);
                  if (audioRef.current) audioRef.current.currentTime = val;
                }}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isPlaying ? 'Pause' : 'Play Selection'}</span>
                </button>
                <button
                  onClick={() => audioRef.current && setStartTime(audioRef.current.currentTime)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                >
                  Set Start
                </button>
                <button
                  onClick={() => audioRef.current && setEndTime(audioRef.current.currentTime)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                >
                  Set End
                </button>
              </div>

              <div className="text-xs text-slate-500">
                Selection Duration:{' '}
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {formatSeconds(Math.max(0, endTime - startTime))}
                </span>
              </div>
            </div>
          </div>

          {/* Action */}
          <div>
            {isProcessing ? (
              <div className="flex items-center justify-center p-3 text-xs text-indigo-600 font-bold gap-2">
                <RotateCw size={14} className="animate-spin" /> Slicing and encoding WAV file...
              </div>
            ) : resultBlob ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Audio Trimmed Successfully! ({(resultBlob.size / 1024).toFixed(0)} KB)
                </span>
                <button
                  onClick={downloadCut}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  <Download size={13} /> Download Cut Audio
                </button>
              </div>
            ) : (
              <button
                onClick={runCut}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Cut & Export Audio
              </button>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
};
