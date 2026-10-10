/**
 * MediaForge - Universal Media Converter & Processing Studio
 * @license Apache-2.0
 */

import React, { Suspense, lazy, useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { HistoryProvider } from './context/HistoryContext';
import { QueueProvider } from './context/QueueContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ToolId } from './types/media';

// Tools Components
const UrlDownloader = lazy(() => import('./components/tools/UrlDownloader').then(module => ({ default: module.UrlDownloader })));
const Dashboard = lazy(() => import('./components/tools/Dashboard').then(module => ({ default: module.Dashboard })));
const VideoConverter = lazy(() => import('./components/tools/VideoConverter').then(module => ({ default: module.VideoConverter })));
const VideoCompressor = lazy(() => import('./components/tools/VideoCompressor').then(module => ({ default: module.VideoCompressor })));
const VideoResizer = lazy(() => import('./components/tools/VideoResizer').then(module => ({ default: module.VideoResizer })));
const VideoCropper = lazy(() => import('./components/tools/VideoCropper').then(module => ({ default: module.VideoCropper })));
const VideoTrimmer = lazy(() => import('./components/tools/VideoTrimmer').then(module => ({ default: module.VideoTrimmer })));
const VideoToGif = lazy(() => import('./components/tools/VideoToGif').then(module => ({ default: module.VideoToGif })));
const VideoToImage = lazy(() => import('./components/tools/VideoToImage').then(module => ({ default: module.VideoToImage })));
const ExtractAudio = lazy(() => import('./components/tools/ExtractAudio').then(module => ({ default: module.ExtractAudio })));

const AudioConverter = lazy(() => import('./components/tools/AudioConverter').then(module => ({ default: module.AudioConverter })));
const AudioCompressor = lazy(() => import('./components/tools/AudioCompressor').then(module => ({ default: module.AudioCompressor })));
const AudioCutter = lazy(() => import('./components/tools/AudioCutter').then(module => ({ default: module.AudioCutter })));
const AudioMerger = lazy(() => import('./components/tools/AudioMerger').then(module => ({ default: module.AudioMerger })));
const AudioToVideo = lazy(() => import('./components/tools/AudioToVideo').then(module => ({ default: module.AudioToVideo })));

const ImageConverter = lazy(() => import('./components/tools/ImageConverter').then(module => ({ default: module.ImageConverter })));
const ImageCompressor = lazy(() => import('./components/tools/ImageCompressor').then(module => ({ default: module.ImageCompressor })));
const ImageResizer = lazy(() => import('./components/tools/ImageResizer').then(module => ({ default: module.ImageResizer })));
const ImageCropper = lazy(() => import('./components/tools/ImageCropper').then(module => ({ default: module.ImageCropper })));
const ImageToPdf = lazy(() => import('./components/tools/ImageToPdf').then(module => ({ default: module.ImageToPdf })));
const ImageToIco = lazy(() => import('./components/tools/ImageToIco').then(module => ({ default: module.ImageToIco })));
const ImageToWebP = lazy(() => import('./components/tools/ImageToWebP').then(module => ({ default: module.ImageToWebP })));

const PdfTools = lazy(() => import('./components/tools/PdfTools').then(module => ({ default: module.PdfTools })));
const FileConverter = lazy(() => import('./components/tools/FileConverter').then(module => ({ default: module.FileConverter })));
const BatchConverter = lazy(() => import('./components/tools/BatchConverter').then(module => ({ default: module.BatchConverter })));
const MediaInfo = lazy(() => import('./components/tools/MediaInfo').then(module => ({ default: module.MediaInfo })));
const HistoryView = lazy(() => import('./components/tools/HistoryView').then(module => ({ default: module.HistoryView })));
const SettingsView = lazy(() => import('./components/tools/SettingsView').then(module => ({ default: module.SettingsView })));

function AppContent() {
  const [currentTool, setCurrentTool] = useState<ToolId>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global hotkeys (Cmd+K / Ctrl+K, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('header input[type="text"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderCurrentTool = () => {
    switch (currentTool) {
      case 'url-downloader':
        return <UrlDownloader />;
      case 'dashboard':
        return <Dashboard onSelectTool={setCurrentTool} />;

      // Video
      case 'video-converter':
        return <VideoConverter />;
      case 'video-compressor':
        return <VideoCompressor />;
      case 'video-resizer':
        return <VideoResizer />;
      case 'video-cropper':
        return <VideoCropper />;
      case 'video-trimmer':
        return <VideoTrimmer />;
      case 'video-to-gif':
        return <VideoToGif />;
      case 'video-to-image':
        return <VideoToImage />;
      case 'extract-audio':
        return <ExtractAudio />;

      // Audio
      case 'audio-converter':
        return <AudioConverter />;
      case 'audio-compressor':
        return <AudioCompressor />;
      case 'audio-cutter':
        return <AudioCutter />;
      case 'audio-merger':
        return <AudioMerger />;
      case 'audio-to-video':
        return <AudioToVideo />;

      // Image
      case 'image-converter':
        return <ImageConverter />;
      case 'image-compressor':
        return <ImageCompressor />;
      case 'image-resizer':
        return <ImageResizer />;
      case 'image-cropper':
        return <ImageCropper />;
      case 'image-to-pdf':
        return <ImageToPdf />;
      case 'image-to-ico':
        return <ImageToIco />;
      case 'image-to-webp':
        return <ImageToWebP />;

      // Document
      case 'pdf-tools':
        return <PdfTools onSelectTool={setCurrentTool} />;
      case 'file-converter':
        return <FileConverter onSelectTool={setCurrentTool} />;

      // Tools
      case 'batch-converter':
        return <BatchConverter />;
      case 'media-info':
        return <MediaInfo />;
      case 'history':
        return <HistoryView />;
      case 'settings':
        return <SettingsView />;

      default:
        return <Dashboard onSelectTool={setCurrentTool} />;
    }
  };

  return (
    <div className="studio-app min-h-screen flex flex-col font-sans">
      <a className="skip-link" href="#workspace">Skip to workspace</a>
      <Header
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <div className="flex flex-1 min-w-0">
        <Sidebar
          currentTool={currentTool}
          onSelectTool={setCurrentTool}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <main id="workspace" tabIndex={-1} className="studio-main flex-1 min-w-0 p-5 sm:p-8 lg:p-10">
          <div className="max-w-7xl mx-auto tool-workspace">
            <Suspense fallback={<div className="studio-notice" role="status">Loading tool…</div>}>{renderCurrentTool()}</Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <HistoryProvider>
        <QueueProvider>
          <AppContent />
        </QueueProvider>
      </HistoryProvider>
    </ThemeProvider>
  );
}
