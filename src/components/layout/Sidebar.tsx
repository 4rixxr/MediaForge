import React, { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, Video, Minimize2, Maximize2, Crop, Scissors, Film, ImageDown, FileAudio, Music, VolumeX, Sliders, Layers, Tv, Image, Shrink, Scaling, FileText, Grid2X2, FileImage, FileSpreadsheet, ArrowLeftRight, ListOrdered, Info, Clock, Settings, ChevronDown, ShieldCheck, Download, X } from 'lucide-react';
import { ToolId } from '../../types/media';

interface SidebarProps {
  currentTool: ToolId;
  onSelectTool: (id: ToolId) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}
interface NavItem { id: ToolId; label: string; icon: React.ElementType; }
interface NavCategory { title: string; icon: React.ElementType; items: NavItem[]; }
const CATEGORIES: NavCategory[] = [
  { title: 'Video', icon: Video, items: [
    { id: 'video-converter', label: 'Convert', icon: Video }, { id: 'video-compressor', label: 'Compress', icon: Minimize2 }, { id: 'video-resizer', label: 'Resize', icon: Maximize2 }, { id: 'video-cropper', label: 'Crop', icon: Crop }, { id: 'video-trimmer', label: 'Trim', icon: Scissors }, { id: 'video-to-gif', label: 'Make a GIF', icon: Film }, { id: 'video-to-image', label: 'Extract frames', icon: ImageDown }, { id: 'extract-audio', label: 'Extract audio', icon: FileAudio },
  ] },
  { title: 'Audio', icon: Music, items: [
    { id: 'audio-converter', label: 'Convert', icon: Music }, { id: 'audio-compressor', label: 'Compress', icon: VolumeX }, { id: 'audio-cutter', label: 'Trim', icon: Sliders }, { id: 'audio-merger', label: 'Merge', icon: Layers }, { id: 'audio-to-video', label: 'Audio to video', icon: Tv },
  ] },
  { title: 'Image', icon: Image, items: [
    { id: 'image-converter', label: 'Convert', icon: Image }, { id: 'image-compressor', label: 'Compress', icon: Shrink }, { id: 'image-resizer', label: 'Resize', icon: Scaling }, { id: 'image-cropper', label: 'Crop', icon: Crop }, { id: 'image-to-ico', label: 'Create an icon', icon: Grid2X2 }, { id: 'image-to-webp', label: 'Image to WebP', icon: FileImage },
  ] },
  { title: 'Document', icon: FileText, items: [
    { id: 'image-to-pdf', label: 'Image to PDF', icon: FileText }, { id: 'pdf-tools', label: 'PDF tools', icon: FileSpreadsheet }, { id: 'file-converter', label: 'File converter', icon: ArrowLeftRight },
  ] },
];
const WORKSPACE: NavItem[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'url-downloader', label: 'Download from URL', icon: Download },
  { id: 'batch-converter', label: 'Batch queue', icon: ListOrdered },
  { id: 'history', label: 'History', icon: Clock },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentTool, onSelectTool, isMobileOpen, onCloseMobile }) => {
  const sidebarRef = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  useEffect(() => {
    const category = CATEGORIES.find((group) => group.items.some((item) => item.id === currentTool));
    if (category) setExpanded((value) => value.includes(category.title) ? value : [...value, category.title]);
  }, [currentTool]);
  useEffect(() => {
    if (!isMobileOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const sidebar = sidebarRef.current;
    const controls = () => sidebar?.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
    controls()?.[0]?.focus();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseMobile();
      if (event.key === 'Tab') {
        const buttons = controls();
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onEscape);
    return () => { document.removeEventListener('keydown', onEscape); previousFocus?.focus(); };
  }, [isMobileOpen, onCloseMobile]);
  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    return <button type="button" key={item.id} onClick={() => { onSelectTool(item.id); onCloseMobile(); }} className={`mf-nav-item${currentTool === item.id ? ' is-active' : ''}`} aria-current={currentTool === item.id ? 'page' : undefined}><Icon size={16} strokeWidth={1.7} /><span>{item.label}</span>{currentTool === item.id && <span className="mf-active-dot" aria-hidden="true" />}</button>;
  };
  return <>
    {isMobileOpen && <button type="button" className="mf-sidebar-backdrop" onClick={onCloseMobile} aria-label="Close navigation" />}
    <aside ref={sidebarRef} id="mf-navigation" role={isMobileOpen ? 'dialog' : undefined} aria-modal={isMobileOpen || undefined} className={`mf-sidebar${isMobileOpen ? ' is-open' : ''}`} aria-label="Workspace navigation">
      <div className="mf-mobile-nav-heading"><span>MediaForge.</span><button type="button" onClick={onCloseMobile} className="mf-icon-button" aria-label="Close navigation"><X size={20} /></button></div>
      <nav className="mf-sidebar-scroll">
        <p className="mf-nav-caption">Workspace</p>
        <div className="mf-nav-section">{WORKSPACE.map(renderItem)}</div>
        <p className="mf-nav-caption mf-tools-caption">Media tools</p>
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isExpanded = expanded.includes(category.title);
          const hasActive = category.items.some((item) => item.id === currentTool);
          return <div className="mf-nav-category" key={category.title}>
            <button type="button" className={`mf-category-toggle${hasActive ? ' has-active' : ''}`} aria-expanded={isExpanded} aria-controls={`mf-category-${category.title}`} onClick={() => setExpanded((value) => isExpanded ? value.filter((title) => title !== category.title) : [...value, category.title])}>
              <Icon size={17} strokeWidth={1.7} /><span>{category.title}</span><small>{category.items.length}</small><ChevronDown size={14} className={isExpanded ? 'is-expanded' : ''} />
            </button>
            {isExpanded && <div className="mf-category-items" id={`mf-category-${category.title}`}>{category.items.map(renderItem)}</div>}
          </div>;
        })}
        <div className="mf-nav-utilities">{renderItem({ id: 'media-info', label: 'Inspect a file', icon: Info })}{renderItem({ id: 'settings', label: 'Settings', icon: Settings })}</div>
      </nav>
      <div className="mf-sidebar-footer"><ShieldCheck size={17} strokeWidth={1.6} /><div><strong>Files stay on your device</strong><p>Media processing in your browser.</p></div></div>
    </aside>
  </>;
};
