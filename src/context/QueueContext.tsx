import {mediaFileCategory} from '../services/mediaFileType';
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { QueueJob, ConversionSettings } from '../types/media';
import { useHistory } from './HistoryContext';

interface QueueContextType {
  jobs: QueueJob[];
  addJobs: (files: File[], defaultTargetFormat?: string, settings?: ConversionSettings) => void;
  updateJob: (id: string, updates: Partial<QueueJob>) => void;
  removeJob: (id: string) => void;
  clearAllJobs: () => void;
  clearCompletedJobs: () => void;
  startJob: (id: string) => Promise<void>;
  startAllWaitingJobs: () => Promise<void>;
  cancelJob: (id: string) => void;
  downloadJobOutput: (id: string) => void;
  downloadAllCompletedAsZip: () => Promise<void>;
  isProcessingAny: boolean;
  isQueuePaused: boolean;
  pauseQueue: () => void;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const { addHistoryItem } = useHistory();
  const jobsRef = useRef<QueueJob[]>([]);
  const runningJobs = useRef(new Set<string>());
  const cancelledJobs = useRef(new Set<string>());
  const runnerActive = useRef(false);
  const paused = useRef(false);
  const [isQueuePaused, setQueuePaused] = useState(false);
  const pauseQueue = () => { paused.current = true; setQueuePaused(true); };
  const commitJobs = (updater: (previous: QueueJob[]) => QueueJob[]) => {
    jobsRef.current = updater(jobsRef.current);
    setJobs(jobsRef.current);
  };
  const releaseOutput = (job: QueueJob) => {
    if (job.outputUrl) URL.revokeObjectURL(job.outputUrl);
  };
  useEffect(() => () => {
    jobsRef.current.forEach((job) => {
      cancelledJobs.current.add(job.id);
      releaseOutput(job);
    });
  }, []);

  const isProcessingAny = jobs.some((j) => j.status === 'processing');

  const addJobs = (files: File[], defaultTargetFormat?: string, settings?: ConversionSettings) => {
    const newJobs: QueueJob[] = files.map((file) => {
      const category=mediaFileCategory(file);
      if(!category)throw Error('Format berkas tidak dikenal: '+file.name);
      const target=defaultTargetFormat||({audio:'mp3',video:'mp4',image:'webp',document:'pdf'}[category]);

      return {
        id: 'job-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        file,
        targetFormat: target,
        category,
        status: 'waiting',
        progress: 0,
        timestamp: Date.now(),
        settings: settings ? {...settings} : undefined,
      };
    });

    commitJobs((prev) => [...prev, ...newJobs]);
  };

  const updateJob = (id: string, updates: Partial<QueueJob>) => {
    commitJobs((prev) =>
      prev.map((job) => {
        if (job.id === id) {
          const updated = { ...job, ...updates };
          return updated;
        }
        return job;
      })
    );
  };

  const removeJob = (id: string) => {
    cancelledJobs.current.add(id);
    const job = jobsRef.current.find((item) => item.id === id);
    if (job) releaseOutput(job);
    commitJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const clearAllJobs = () => {
    jobsRef.current.forEach((job) => { cancelledJobs.current.add(job.id); releaseOutput(job); });
    commitJobs(() => []);
  };

  const clearCompletedJobs = () => {
    jobsRef.current.filter((job) => job.status === 'completed').forEach(releaseOutput);
    commitJobs((prev) => prev.filter((j) => j.status !== 'completed'));
  };

  const cancelJob = (id: string) => {
    cancelledJobs.current.add(id);
    updateJob(id, { status: 'cancelled', progress: 0 });
  };

  const downloadJobOutput = (id: string) => {
    const job = jobsRef.current.find((j) => j.id === id);
    if (!job || !job.outputBlob || !job.outputFileName) return;

    const url = job.outputUrl || URL.createObjectURL(job.outputBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = job.outputFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (!job.outputUrl) setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadAllCompletedAsZip = async () => {
    const completed = jobs.filter((j) => j.status === 'completed' && j.outputBlob && j.outputFileName);
    if (completed.length === 0) return;

    const zip = new JSZip();
    const usedNames = new Set<string>();
    completed.forEach((job) => {
      if (job.outputBlob && job.outputFileName) {
        let name = job.outputFileName;
        let suffix = 2;
        const dot = name.lastIndexOf('.');
        const stem = dot >= 0 ? name.slice(0, dot) : name;
        const extension = dot >= 0 ? name.slice(dot) : '';
        while (usedNames.has(name)) name = `${stem} (${suffix++})${extension}`;
        usedNames.add(name);
        zip.file(name, job.outputBlob);
      }
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MediaForge_Converted_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const startJob = async (id: string) => {
    const job = jobsRef.current.find((j) => j.id === id);
    if (!job || runningJobs.current.has(id) || job.status === 'completed') return;
    runningJobs.current.add(id);
    cancelledJobs.current.delete(id);
    releaseOutput(job);

    updateJob(id, { status: 'processing', progress: 5, errorMessage: undefined, outputUrl: undefined, outputBlob: undefined });

    try {
      const { convertImage } = await import('../services/imageProcessor');
      const { convertAudio } = await import('../services/audioProcessor');
      const { processVideo } = await import('../services/videoProcessor');

      const ext = job.fileName.split('.').pop()?.toLowerCase() || '';
      const baseName = job.fileName.replace(/\.[^/.]+$/, '');
      let outputBlob: Blob;
      let outExt = job.targetFormat.toLowerCase();

      const reportProgress = (progress: number) => {
        if (!cancelledJobs.current.has(id)) updateJob(id, {progress});
      };
      if (job.settings?.mode === 'audio-video') {
        const {ffmpegService} = await import('../services/ffmpegService');
        outputBlob = await ffmpegService.audioToVideo(job.file, outExt, job.settings, reportProgress);
      } else if (job.settings?.mode === 'video-audio') {
        const res = await convertAudio(job.file, {
          format: outExt as any, bitrate: job.settings.bitrate, quality:job.settings.quality, channels: job.settings.channels,
        }, reportProgress);
        outputBlob = res.blob;
        outExt = res.format;
      } else if (job.category === 'image') {
        if (!['jpeg', 'jpg', 'png', 'webp', 'avif', 'bmp', 'ico'].includes(outExt)) throw new Error('Choose a supported image output format.');
        const fmt = (outExt === 'jpg' ? 'jpeg' : outExt) as any;

        const res = await convertImage(job.file, {
          format: fmt,
          quality: 0.9,
        });
        outputBlob = res.blob;
        outExt = fmt === 'jpeg' ? 'jpg' : fmt;
      } else if (job.category === 'audio') {
        const res = await convertAudio(job.file, {
          format: (outExt as any) || 'wav',
          bitrate: job.settings?.bitrate,
          quality: job.settings?.quality,
          channels: job.settings?.channels,
        }, (prog) => {
          if (!cancelledJobs.current.has(id)) updateJob(id, { progress: prog });
        });
        outputBlob = res.blob;
        outExt = res.format;
      } else if (job.category === 'video') {
        const res = await processVideo(job.file, {
          format: (outExt as any) || 'mp4',
          bitrate: job.settings?.videoBitrate,
          fps: job.settings?.fps,
        }, (prog) => {
          if (!cancelledJobs.current.has(id)) updateJob(id, { progress: prog });
        });
        outputBlob = res.blob;
      } else {
        throw new Error('PDF conversion is not available in the batch queue. Use Images to PDF for image files.');
      }

      if (cancelledJobs.current.has(id) || !jobsRef.current.some((item) => item.id === id)) return;
      const outputFileName = `${baseName}.${outExt}`;
      const outputUrl = URL.createObjectURL(outputBlob);

      updateJob(id, {
        status: 'completed',
        progress: 100,
        outputBlob,
        outputUrl,
        outputFileName,
        outputSize: outputBlob.size,
      });

      // Add to history
      addHistoryItem({
        inputFileName: job.fileName,
        outputFileName,
        inputSize: job.fileSize,
        outputSize: outputBlob.size,
        inputFormat: ext.toUpperCase(),
        outputFormat: outExt.toUpperCase(),
        category: job.settings?.mode === 'video-audio' ? 'audio' : job.settings?.mode === 'audio-video' ? 'video' : job.category,
      });
    } catch (err: any) {
      if (cancelledJobs.current.has(id)) return;
      console.error('Job failed:', err);
      updateJob(id, {
        status: 'failed',
        progress: 0,
        errorMessage: err.message || 'Conversion failed in browser.',
      });
    } finally {
      runningJobs.current.delete(id);
    }
  };

  const startAllWaitingJobs = async () => {
    paused.current = false; setQueuePaused(false);
    if (runnerActive.current) return;
    runnerActive.current = true;
    try {
      while (!paused.current) {
        const job = jobsRef.current.find(item => item.status === 'waiting' && !runningJobs.current.has(item.id));
        if (!job) break;
        await startJob(job.id);
      }
    } finally { runnerActive.current = false; }
  };

  return (
    <QueueContext.Provider
      value={{
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
        isQueuePaused,
        pauseQueue,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error('useQueue must be used within QueueProvider');
  return ctx;
};
