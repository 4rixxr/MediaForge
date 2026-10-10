import React, { useState } from 'react';
import { Tv, Download, RotateCw, CheckCircle2, Image as ImageIcon, Music } from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { audioToVideo } from '../../services/audioProcessor';

export const AudioToVideo: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const handleAudio = (files: File[]) => {
    if (!files[0]) return;
    setAudioFile(files[0]);
    setResultBlob(null);
  };

  const handleImage = (files: File[]) => {
    if (!files[0]) return;
    setCoverImage(files[0]);
    setCoverPreview(URL.createObjectURL(files[0]));
    setResultBlob(null);
  };

  const runConvert = async () => {
    if (!audioFile) return;
    setIsProcessing(true);
    setProgress(5);

    try {
      const res = await audioToVideo(audioFile, coverImage || undefined, 30, (p) => setProgress(p));
      setResultBlob(res.blob);
      setIsProcessing(false);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  const downloadVideo = () => {
    if (!resultBlob || !audioFile) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultBlob);
    a.download = `${audioFile.name.replace(/\.[^/.]+$/, '')}_visualizer.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
          <Tv size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Audio to Video</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Render your audio track into an HD 720p video with album artwork and an animated audio spectrum waveform.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Audio selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Music size={14} className="text-indigo-500" /> 1. Select Audio Track:
          </label>
          {!audioFile ? (
            <DropZone
              onFilesSelected={handleAudio}
              accept="audio/*"
              multiple={false}
              label="Choose audio track"
              compact={true}
            />
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex justify-between items-center text-xs">
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">{audioFile.name}</div>
                <div className="text-slate-500">{(audioFile.size / (1024 * 1024)).toFixed(1)} MB</div>
              </div>
              <button onClick={() => setAudioFile(null)} className="text-rose-500 hover:underline">Change</button>
            </div>
          )}
        </div>

        {/* Cover Art selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <ImageIcon size={14} className="text-violet-500" /> 2. Cover Artwork (Optional):
          </label>
          {!coverImage ? (
            <DropZone
              onFilesSelected={handleImage}
              accept="image/*"
              multiple={false}
              label="Choose cover background"
              description="PNG or JPG artwork (or default studio gradient)"
              compact={true}
            />
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                {coverPreview && <img src={coverPreview} alt="Cover" className="h-10 w-10 object-cover rounded" />}
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{coverImage.name}</div>
                  <div className="text-slate-500">{(coverImage.size / 1024).toFixed(0)} KB</div>
                </div>
              </div>
              <button onClick={() => { setCoverImage(null); setCoverPreview(null); }} className="text-rose-500 hover:underline">Remove</button>
            </div>
          )}
        </div>
      </div>

      {audioFile && (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-xs space-y-4">
          <div className="text-xs text-slate-500">
            The generator renders 1280×720 HD video at 30 FPS with real-time sound frequency bars.
          </div>

          <div>
            {isProcessing ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-indigo-600">
                  <span className="flex items-center gap-1.5">
                    <RotateCw size={14} className="animate-spin" /> Synthesizing audio visualizer video...
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
                  <CheckCircle2 size={16} /> Video Rendered! ({(resultBlob.size / (1024 * 1024)).toFixed(1)} MB)
                </span>
                <button
                  onClick={downloadVideo}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs"
                >
                  <Download size={14} /> Download Video
                </button>
              </div>
            ) : (
              <button
                onClick={runConvert}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Generate Video
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
