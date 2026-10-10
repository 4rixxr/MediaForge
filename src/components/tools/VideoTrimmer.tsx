import React, { useState, useRef, useEffect } from 'react';
import { Scissors, Play, Pause, Download, RotateCw, CheckCircle2, RotateCcw } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { processVideo, loadVideoElement } from '../../services/videoProcessor';

export const VideoTrimmer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFile = async (files: File[]) => {
    if (!files[0]) return;
    const f = files[0];
    setFile(f);
    setResultBlob(null);

    const { video, cleanup } = await loadVideoElement(f);
    const dur = video.duration || 10;
    setDuration(dur);
    setStartTime(0);
    setEndTime(dur);
    setCurrentTime(0);
    cleanup();

    setVideoUrl(URL.createObjectURL(f));
  };

  const formatTimestamp = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);
      if (cur >= endTime) {
        videoRef.current.pause();
        setIsPlaying(false);
        videoRef.current.currentTime = startTime;
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= endTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const setStartToCurrent = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setStartTime(Math.min(cur, endTime - 0.2));
    }
  };

  const setEndToCurrent = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setEndTime(Math.max(cur, startTime + 0.2));
    }
  };

  const runTrim = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(5);

    try {
      const res = await processVideo(
        file,
        {
          startTime,
          endTime,
        },
        (p) => setProgress(p)
      );

      setResultBlob(res.blob);
      setIsProcessing(false);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  const downloadTrimmed = () => {
    if (!resultBlob || !file) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultBlob);
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}_trimmed.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
          <Scissors size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Video Trimmer</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cut and trim video segments with millisecond timestamp precision.
          </p>
        </div>
      </div>

      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="video/*"
          multiple={false}
          label="Choose video to trim"
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 shadow-xs">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{file.name}</span>
            <button
              onClick={() => { setFile(null); setVideoUrl(null); setResultBlob(null); }}
              className="text-xs text-slate-400 hover:text-rose-500"
            >
              Choose different file
            </button>
          </div>

          {/* Video Player */}
          {videoUrl && (
            <div className="relative overflow-hidden rounded-xl bg-black flex items-center justify-center max-h-96">
              <video
                ref={videoRef}
                src={videoUrl}
                onTimeUpdate={handleTimeUpdate}
                className="max-h-96 w-auto max-w-full"
              />
            </div>
          )}

          {/* Timeline and Range Controls */}
          <div className="space-y-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-200/80 dark:border-slate-800">
            {/* Scrubber slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono text-slate-500">
                <span>Start: {formatTimestamp(startTime)}</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  Current: {formatTimestamp(currentTime)}
                </span>
                <span>End: {formatTimestamp(endTime)}</span>
              </div>

              <div className="relative pt-2">
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.05}
                  value={currentTime}
                  onChange={(e) => {
                    const t = Number(e.target.value);
                    setCurrentTime(t);
                    if (videoRef.current) videoRef.current.currentTime = t;
                  }}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>

            {/* Precision buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isPlaying ? 'Pause' : 'Preview Selection'}</span>
                </button>

                <button
                  onClick={setStartToCurrent}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                >
                  Set Start Point
                </button>
                <button
                  onClick={setEndToCurrent}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                >
                  Set End Point
                </button>
              </div>

              <div className="text-xs text-slate-500">
                Trimmed Length:{' '}
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatTimestamp(Math.max(0, endTime - startTime))}
                </span>
              </div>
            </div>
          </div>

          {/* Action */}
          <div>
            {isProcessing ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-indigo-600">
                  <span className="flex items-center gap-1.5">
                    <RotateCw size={14} className="animate-spin" /> Trimming video track...
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
                  <CheckCircle2 size={16} /> Video Trimmed Successfully!
                </span>
                <button
                  onClick={downloadTrimmed}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  <Download size={13} /> Download Trimmed Clip
                </button>
              </div>
            ) : (
              <button
                onClick={runTrim}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Export Trimmed Video
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
