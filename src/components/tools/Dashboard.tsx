import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, AudioLines, FileText, FolderOpen, Image as ImageIcon, Layers, LockKeyhole, Video, Wrench } from 'lucide-react';
import { ToolCategory, ToolId } from '../../types/media';
import { TOOLS_LIST } from '../../constants/tools';
import './dashboard.css';

interface DashboardProps {
  onSelectTool: (id: ToolId) => void;
}

const categories: { id: 'all' | ToolCategory; label: string }[] = [
  { id: 'all', label: 'All tools' },
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Video' },
  { id: 'audio', label: 'Audio' },
  { id: 'document', label: 'Document' },
  { id: 'tools', label: 'Utilities' },
];
const categoryIcons = { home: FolderOpen, video: Video, audio: AudioLines, image: ImageIcon, document: FileText, tools: Wrench };
const descriptions: Partial<Record<ToolId, string>> = {
  'video-converter': 'Change video format and encoding.',
  'video-compressor': 'Adjust bitrate to reduce file size.',
  'video-resizer': 'Set a resolution or custom dimensions.',
  'video-cropper': 'Choose the area of the frame to keep.',
  'video-trimmer': 'Keep just the part of a clip you need.',
  'video-to-gif': 'Turn a short clip into an animated GIF.',
  'video-to-image': 'Save frames from a video as images.',
  'extract-audio': 'Save the soundtrack from a video.',
  'audio-converter': 'Change audio format and bitrate.',
  'audio-compressor': 'Reduce audio size with quality controls.',
  'audio-cutter': 'Set the start and end of an audio clip.',
  'audio-merger': 'Combine audio files into one track.',
  'audio-to-video': 'Pair an audio track with an image.',
  'image-converter': 'Change image format and quality.',
  'image-compressor': 'Balance image quality and file size.',
  'image-resizer': 'Resize by dimensions or percentage.',
  'image-cropper': 'Reframe an image for your next project.',
  'image-to-pdf': 'Collect images in a single PDF.',
  'image-to-ico': 'Create an icon from an image.',
  'image-to-webp': 'Prepare WebP images for the web.',
  'pdf-tools': 'Find document and PDF workflows.',
  'file-converter': 'Add media to your conversion queue.',
  'batch-converter': 'Queue multiple files for conversion.',
  'media-info': 'Inspect file dimensions and metadata.',
  history: 'Review conversions from this browser.',
  settings: 'Choose your theme and manage history.',
};
const shortcuts = [
  { id: 'image-compressor' as ToolId, title: 'Make images lighter', detail: 'Compress images', icon: ImageIcon },
  { id: 'video-converter' as ToolId, title: 'Change a video format', detail: 'Convert video', icon: Video },
  { id: 'audio-cutter' as ToolId, title: 'Keep the right moment', detail: 'Trim audio', icon: AudioLines },
];

export const Dashboard: React.FC<DashboardProps> = ({ onSelectTool }) => {
  const [category, setCategory] = useState<'all' | ToolCategory>('all');
  const visibleTools = TOOLS_LIST.filter((tool) => category === 'all' || tool.category === category);

  return (
    <div className="mf-workspace">
      <div className="mf-workspace-heading">
        <div>
          <p className="mf-eyebrow">YOUR MEDIA WORKBENCH</p>
          <h1>A little less file work.</h1>
          <p className="mf-intro">Convert, refine, and prepare your media. All in one place.</p>
        </div>
        <button type="button" className="mf-text-button" onClick={() => onSelectTool('history')}>
          Conversion history <ArrowUpRight size={15} aria-hidden="true" />
        </button>
      </div>

      <section className="mf-start-panel" aria-labelledby="start-heading">
        <div className="mf-start-main">
          <div className="mf-folder-mark" aria-hidden="true"><FolderOpen size={32} strokeWidth={1.4} /></div>
          <div>
            <p className="mf-eyebrow">START A NEW TASK</p>
            <h2 id="start-heading">What are you working on?</h2>
            <p>Add a media file and choose its output format.</p>
          </div>
          <button type="button" className="mf-primary-button" onClick={() => onSelectTool('file-converter')}>
            Get started <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="mf-start-footer">
          <span><LockKeyhole size={14} aria-hidden="true" /> Media processing runs on your device.</span>
          <button type="button" onClick={() => onSelectTool('batch-converter')}><Layers size={14} aria-hidden="true" /> Working with several files? <span>Open batch converter</span><ArrowUpRight size={14} aria-hidden="true" /></button>
        </div>
      </section>

      <section className="mf-shortcut-section" aria-labelledby="shortcuts-heading">
        <h2 id="shortcuts-heading" className="mf-section-label">Everyday tasks</h2>
        <div className="mf-shortcuts">
          {shortcuts.map(({ id, title, detail, icon: Icon }) => (
            <button type="button" key={id} className="mf-shortcut" onClick={() => onSelectTool(id)}>
              <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
              <span><strong>{title}</strong><small>{detail}</small></span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <section className="mf-tool-section" aria-labelledby="tools-heading">
        <div className="mf-section-heading"><h2 id="tools-heading">Find your tool</h2><span>{TOOLS_LIST.length} tools, one workspace</span></div>
        <div className="mf-filters" role="group" aria-label="Filter tools by category">
          {categories.map(({ id, label }) => (
            <button type="button" key={id} aria-pressed={category === id} onClick={() => setCategory(id)}>
              {label}<span>{id === 'all' ? TOOLS_LIST.length : TOOLS_LIST.filter((tool) => tool.category === id).length}</span>
            </button>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">{visibleTools.length} tools shown</p>
        <div className="mf-tool-grid">
          {visibleTools.map((tool) => {
            const Icon = categoryIcons[tool.category];
            return (
              <button type="button" className="mf-tool" key={tool.id} onClick={() => onSelectTool(tool.id)}>
                <span className="mf-tool-icon"><Icon size={19} strokeWidth={1.5} aria-hidden="true" /></span>
                <span className="mf-tool-copy"><strong>{tool.name}</strong><small>{descriptions[tool.id] || tool.description}</small></span>
                <ArrowUpRight className="mf-tool-arrow" size={15} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>
      <div className="mf-workspace-note"><span>Made for the work between capture and publish.</span><span>Processing speed depends on your device and file size.</span></div>
    </div>
  );
};
