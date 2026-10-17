import {audioProfiles,audioRates} from '../../../shared/media-profiles.js';
import React, { useState, useRef, useEffect } from 'react';
import {
  Music,
  Play,
  Pause,
  Download,
  RotateCw,
  CheckCircle2,
  Sliders,
  Tag,
  Volume2,
} from 'lucide-react';
import { DropZone } from '../common/DropZone';
import { PrivacyIndicator } from '../common/PrivacyIndicator';
import { convertAudio, decodeAudioFile, audioBufferToWav } from '../../services/audioProcessor';
import { useHistory } from '../../context/HistoryContext';

export const AudioConverter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState<'mp3' | 'wav' | 'flac' | 'aac' | 'm4a' | 'ogg' | 'opus' | 'wma'>('mp3');
  const [bitrate, setBitrate] = useState<number>(320);
  const [sampleRate, setSampleRate] = useState<number>(44100);
  const [channels, setChannels] = useState<1 | 2>(2);
  const [volume, setVolume] = useState<number>(1.0);
  // Metadata tags
  const [metaTitle, setMetaTitle] = useState('');
  const [metaArtist, setMetaArtist] = useState('');
  const [metaAlbum, setMetaAlbum] = useState('');
  const [metaGenre, setMetaGenre] = useState('');
  const [metaYear, setMetaYear] = useState('');
  const [showMetadata, setShowMetadata] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { addHistoryItem } = useHistory();

  const formats = Object.keys(audioProfiles).map(f=>f.toUpperCase());
  const profile=audioProfiles[targetFormat];
  const [error,setError]=useState('');

  useEffect(()=>()=>{if(audioUrl)URL.revokeObjectURL(audioUrl);},[audioUrl]);

  const handleFile = async (files: File[]) => {
    if (!files[0]) return;
    const f = files[0];
    setFile(f);
    setResultBlob(null);
    setAudioUrl(URL.createObjectURL(f));
    setMetaTitle(f.name.replace(/\.[^/.]+$/, ''));
  };

  const togglePlayback = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const element=audioRef.current,previous=element.src;
      try{await element.play();setIsPlaying(true);}
      catch{
        if(!file)return;
        try{const buffer=await decodeAudioFile(file);if(audioRef.current!==element||element.src!==previous)return;const url=URL.createObjectURL(audioBufferToWav(buffer));setAudioUrl(url);element.src=url;await element.play();setIsPlaying(true);}
        catch(error){setError(error instanceof Error?error.message:'Preview audio gagal.');}
      }
    }
  };

  const runConvert = async () => {
    if (!file) return;
    setError('');setResultBlob(null);setIsConverting(true);
    setProgress(10);

    try {
      const res = await convertAudio(
        file,
        {
          format: targetFormat.toLowerCase() as any,
          bitrate:profile.quality||profile.lossless?undefined:bitrate,
          quality:profile.quality?bitrate:undefined,
          metadata:{title:metaTitle,artist:metaArtist,album:metaAlbum,genre:metaGenre,date:metaYear},
          sampleRate,
          channels,
          volume,
        },
        (p) => setProgress(p)
      );

      setResultBlob(res.blob);
      setIsConverting(false);

      addHistoryItem({
        inputFileName: file.name,
        outputFileName: `${file.name.replace(/\.[^/.]+$/, '')}.${targetFormat.toLowerCase()}`,
        inputSize: file.size,
        outputSize: res.blob.size,
        inputFormat: file.name.split('.').pop()?.toUpperCase() || 'AUDIO',
        outputFormat: targetFormat.toUpperCase(),
        category: 'audio',
      });
    } catch (e) {
      setError(e instanceof Error?e.message:String(e));
      setIsConverting(false);
    }
  };

  const downloadAudio = () => {
    if (!resultBlob || !file) return;
    const a = document.createElement('a');
    const downloadUrl = URL.createObjectURL(resultBlob);
    a.href = downloadUrl;
    a.download = `${metaTitle || file.name.replace(/\.[^/.]+$/, '')}.${targetFormat.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(downloadUrl),60000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
          <Music size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Audio Converter</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Transcode audio files with bitrate tuning, channel mixing, volume boost, and metadata where supported by the selected container.
          </p>
        </div>
      </div>

      <PrivacyIndicator />
      {error&&<p className="studio-notice" role="alert">{error}</p>}

      {!file ? (
        <DropZone
          onFilesSelected={handleFile}
          accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac,.opus,.wma"
          multiple={false}
          label="Choose audio file to convert"
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-5 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlayback}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{file.name}</span>
                <span className="ml-2 text-xs text-slate-500">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
              </div>
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
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}

          {/* Format selection */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Format:</span>
            <div className="flex flex-wrap gap-2">
              {formats.map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => {const f=fmt.toLowerCase();setTargetFormat(f as any);setBitrate(audioProfiles[f].default);setSampleRate(f==='opus'?48000:44100);setResultBlob(null);}}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    targetFormat.toUpperCase() === fmt
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Bitrate</label>
              <select
                value={profile.lossless?0:bitrate}
                disabled={!!profile.lossless}
                onChange={(e) => {setBitrate(Number(e.target.value));setResultBlob(null);}}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-slate-100"
              >
                {profile.lossless?<option value={0}>{targetFormat==='wav'?'PCM 16-bit · tanpa bitrate lossy':'FLAC · lossless'}</option>:audioRates(targetFormat,channels,sampleRate).map((n:number)=><option key={n} value={n}>{profile.quality?`Vorbis Q${n} · VBR`:`${n} kbps${targetFormat==='opus'?' · VBR target':''}`}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Sample Rate</label>
              <select
                value={sampleRate}
                onChange={(e) => {setSampleRate(Number(e.target.value));setResultBlob(null);}}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-slate-100"
              >
                {profile.samples.map((n:number)=><option value={n} key={n}>{n.toLocaleString()} Hz</option>)}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Channels</label>
              <select
                value={channels}
                onChange={(e) => {setChannels(Number(e.target.value) as any);const rates=audioRates(targetFormat,Number(e.target.value),sampleRate);if(!profile.lossless&&!rates.includes(bitrate))setBitrate(rates.at(-1)!);setResultBlob(null);}}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-slate-100"
              >
                <option value={2}>Stereo (2 Channels)</option>
                <option value={1}>Mono (1 Channel)</option>
              </select>
            </div>
          </div>

          {/* Volume Booster Slider */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3.5 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Volume2 size={14} /> Volume Gain Multiplier
              </span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.05"
              value={volume}
              onChange={(e) => {setVolume(Number(e.target.value));setResultBlob(null);}}
              className="w-full accent-indigo-600"
            />
          </div>

          {/* Metadata Section toggle */}
          <div>
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600"
            >
              <Tag size={13} />
              <span>{showMetadata ? 'Hide Metadata Editor' : 'Edit Metadata (Title, Artist, Album)'}</span>
            </button>

            {showMetadata && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1">Track Title</label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => {setMetaTitle(e.target.value);setResultBlob(null);}}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Artist</label>
                  <input
                    type="text"
                    value={metaArtist}
                    onChange={(e) => {setMetaArtist(e.target.value);setResultBlob(null);}}
                    placeholder="e.g. MediaForge Artist"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Album</label>
                  <input
                    type="text"
                    value={metaAlbum}
                    onChange={(e) => {setMetaAlbum(e.target.value);setResultBlob(null);}}
                    placeholder="e.g. Mastered Mix"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Genre</label>
                  <input
                    type="text"
                    value={metaGenre}
                    onChange={(e) => {setMetaGenre(e.target.value);setResultBlob(null);}}
                    placeholder="e.g. Electronic"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Year</label>
                  <input
                    type="text"
                    value={metaYear}
                    onChange={(e) => {setMetaYear(e.target.value);setResultBlob(null);}}
                    placeholder="2026"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action */}
          <div>
            {isConverting ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-indigo-600">
                  <span className="flex items-center gap-1.5">
                    <RotateCw size={14} className="animate-spin" /> Processing audio track...
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
                  <CheckCircle2 size={16} /> Audio Converted! ({(resultBlob.size / 1024).toFixed(0)} KB)
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
                onClick={runConvert}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs"
              >
                Convert Audio Now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
