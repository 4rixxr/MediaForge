import { useLanguage } from '../../context/LanguageContext';
import React, { useEffect, useRef, useState } from 'react';
import { Search, Sun, Moon, Laptop, Layers, Menu, X, Command, ArrowUpRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useQueue } from '../../context/QueueContext';
import { ToolId } from '../../types/media';
import { TOOLS_LIST } from '../../constants/tools';
import './shell.css';

interface HeaderProps {
  currentTool: ToolId;
  onSelectTool: (id: ToolId) => void;
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentTool, onSelectTool, onToggleMobileSidebar, isMobileSidebarOpen }) => {
  const {t}=useLanguage();
  const { theme, setTheme } = useTheme();
  const { jobs } = useQueue();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeResult, setActiveResult] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const activeJobsCount = jobs.filter((job) => job.status === 'processing' || job.status === 'waiting').length;
  const query = searchQuery.trim().toLowerCase();
  const filteredTools = query ? TOOLS_LIST.filter((tool) => `${tool.name} ${tool.description} ${tool.category}`.toLowerCase().includes(query)) : [];
  const currentName = TOOLS_LIST.find((tool) => tool.id === currentTool)?.name || 'Workspace';

  useEffect(() => {
    const closeSearch = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setIsSearchOpen(false);
    };
    document.addEventListener('pointerdown', closeSearch);
    return () => document.removeEventListener('pointerdown', closeSearch);
  }, []);

  const chooseTool = (id: ToolId) => {
    onSelectTool(id);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <header className={`mf-header${['dashboard','file-converter','batch-converter'].includes(currentTool) ? ' is-converter' : ''}`}>
      <div className="mf-brand-area">
        <button type="button" className="mf-icon-button mf-menu-toggle" onClick={onToggleMobileSidebar} aria-label={isMobileSidebarOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={isMobileSidebarOpen} aria-controls="mf-navigation">
          {isMobileSidebarOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
        <button type="button" onClick={() => onSelectTool('dashboard')} className="mf-brand" aria-label="MediaForge workspace">
          <span className="mf-brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span>MediaForge<span className="mf-brand-period">.</span></span>
        </button>
      </div>
      {['dashboard','file-converter','batch-converter'].includes(currentTool) ? <div className="mf-converter-title"><h1>{t('Converter')}</h1><p>{t('Ubah audio, video, dan ekstrak audio dari video dalam satu tempat.')}</p></div> : <span className="mf-breadcrumb">{t(currentName)}</span>}
      <div className="mf-search" ref={searchRef}>
        <Search size={16} aria-hidden="true" />
        <input
          type="text"
          aria-label="Search media tools"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isSearchOpen && !!query}
          aria-controls="mf-search-results"
          aria-activedescendant={isSearchOpen && filteredTools[activeResult] ? `mf-result-${filteredTools[activeResult].id}` : undefined}
          value={searchQuery}
          placeholder={t('Find a tool or format…')}
          onChange={(event) => { setSearchQuery(event.target.value); setActiveResult(0); setIsSearchOpen(true); }}
          onFocus={() => setIsSearchOpen(true)}
          onBlur={(event) => { if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node)) setIsSearchOpen(false); }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') { setIsSearchOpen(false); event.currentTarget.blur(); }
            if (event.key === 'ArrowDown' && filteredTools.length) { event.preventDefault(); setIsSearchOpen(true); setActiveResult((value) => (value + 1) % filteredTools.length); }
            if (event.key === 'ArrowUp' && filteredTools.length) { event.preventDefault(); setActiveResult((value) => (value - 1 + filteredTools.length) % filteredTools.length); }
            if (event.key === 'Enter' && isSearchOpen && filteredTools[activeResult]) { event.preventDefault(); chooseTool(filteredTools[activeResult].id); }
          }}
        />
        <kbd aria-hidden="true"><Command size={10} /> K</kbd>
        {isSearchOpen && query && (
          <div className="mf-search-results" id="mf-search-results" role="listbox" aria-label="Matching tools">
            <p className="mf-search-caption">{filteredTools.length ? `${filteredTools.length} matching tools` : 'No tools found. Try “image” or “MP4”.'}</p>
            {filteredTools.map((tool, index) => (
              <button type="button" key={tool.id} id={`mf-result-${tool.id}`} role="option" aria-selected={index === activeResult} className="mf-search-result" onMouseEnter={() => setActiveResult(index)} onClick={() => chooseTool(tool.id)}>
                <span><strong>{tool.name}</strong><small>{tool.description}</small></span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mf-header-actions">
        <button type="button" onClick={() => onSelectTool('batch-converter')} className="mf-queue-button" aria-label={`Open batch queue${activeJobsCount ? `, ${activeJobsCount} active jobs` : ''}`}>
          <Layers size={16} /><span>{t('Queue')}</span>{activeJobsCount > 0 && <b>{activeJobsCount}</b>}
        </button>
        <div className="mf-theme-switch" role="group" aria-label="Color theme">
          {([{ value: 'light', label: 'Light theme', Icon: Sun }, { value: 'dark', label: 'Dark theme', Icon: Moon }, { value: 'system', label: 'System theme', Icon: Laptop }] as const).map(({ value, label, Icon }) => (
            <button type="button" key={value} onClick={() => setTheme(value)} aria-label={label} title={label} aria-pressed={theme === value}><Icon size={14} /></button>
          ))}
        </div>
      </div>
    </header>
  );
};
