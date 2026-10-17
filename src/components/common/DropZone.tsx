import {reportToolError} from '../../services/toolErrors';
import React, { useRef, useState, useEffect, useCallback, useId } from 'react';
import { Upload, FileUp, AlertCircle, ClipboardCheck } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void | Promise<void>;
  accept?: string;
  multiple?: boolean;
  label?: string;
  description?: string;
  compact?: boolean;
}

function matchesAccept(file: File, accept: string) {
  return accept.split(',').some((entry) => {
    const type = entry.trim().toLowerCase();
    if (!type || type === '*/*' || type === '*') return true;
    if (type.startsWith('.')) return file.name.toLowerCase().endsWith(type);
    if (type.endsWith('/*')) return file.type.toLowerCase().startsWith(type.slice(0, -1));
    return file.type.toLowerCase() === type;
  });
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  accept = '*/*',
  multiple = true,
  label = 'Drop your files here',
  description = 'Choose from your device, or paste a file from the clipboard.',
  compact = false,
}) => {
  const extensions={audio:'.mp3,.wav,.aac,.m4a,.flac,.ogg,.opus,.aiff,.aif,.wma',video:'.mp4,.webm,.mkv,.mov,.avi,.m4v,.ts,.mpg,.mpeg,.mpeg2,.dat,.wmv',image:'.png,.jpg,.jpeg,.webp,.avif,.gif,.bmp,.ico,.svg'};
  for(const [kind,list] of Object.entries(extensions))if(accept.includes(kind+'/*'))accept+=','+list;
  const [isDragging, setIsDragging] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [pastedNotification, setPastedNotification] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pasteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descriptionId = useId();
  const warningId = useId();

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList?.length||inputRef.current?.matches(':disabled')) return false;
    const allFiles = Array.from(fileList);
    const accepted = allFiles.filter((file) => matchesAccept(file, accept));
    const files = multiple ? accepted : accepted.slice(0, 1);
    const messages: string[] = [];
    if (accepted.length !== allFiles.length) messages.push('Some files were skipped because their format is not supported by this tool.');
    if (!multiple && accepted.length > 1) messages.push('This tool accepts one file at a time. The first supported file was selected.');
    if (files.some((file) => file.size > 150 * 1024 * 1024)) messages.push('Files over 150 MB may need more time and browser memory.');
    setWarning(messages.join(' ') || null);
    if (!files.length) return false;
    try { Promise.resolve(onFilesSelected(files)).catch(error=>{setWarning(error instanceof Error?error.message:String(error));reportToolError(error);}); } catch(error){reportToolError(error);}
    return true;
  }, [accept, multiple, onFilesSelected]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea'))) return;
      if (!event.clipboardData?.files.length) return;
      if (handleFiles(event.clipboardData.files)) {
        event.preventDefault();
        setPastedNotification(true);
        if (pasteTimer.current) clearTimeout(pasteTimer.current);
        pasteTimer.current = setTimeout(() => setPastedNotification(false), 3000);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFiles]);

  useEffect(() => () => {
    if (pasteTimer.current) clearTimeout(pasteTimer.current);
  }, []);

  return (
    <div className="w-full space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        aria-label={multiple ? 'Choose media files' : 'Choose a media file'}
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
        className="hidden"
        tabIndex={-1}
      />
      <button
        type="button"
        aria-describedby={`${descriptionId}${warning ? ` ${warningId}` : ''}`}
        onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`group relative flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#345644] dark:focus-visible:outline-[#b4d0b5] ${
          isDragging
            ? 'border-[#345644] bg-[#e8eee4] dark:border-[#b4d0b5] dark:bg-[#303e2c]'
            : 'border-[#c7cdc1] bg-[#fafbf7] hover:border-[#345644] hover:bg-[#f0f3eb] dark:border-[#4a5744] dark:bg-[#222820] dark:hover:border-[#b4d0b5] dark:hover:bg-[#2a3326]'
        } ${compact ? 'px-4 py-7' : 'px-6 py-12'}`}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#edf0e7] text-[#345644] dark:bg-[#303e2c] dark:text-[#c4dac0]">
          <Upload size={22} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <span className="mt-4 text-sm font-semibold text-[#20251f] dark:text-[#e8ebe3]">{isDragging ? 'Release to add your files' : label}</span>
        <span id={descriptionId} className="mt-2 max-w-md text-xs leading-relaxed text-[#6b7067] dark:text-[#abb3a5]">{description}</span>
        <span className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md bg-[#345644] px-4 py-2 text-xs font-semibold text-white">
          <FileUp size={14} aria-hidden="true" />{multiple ? 'Choose files' : 'Choose file'}
        </span>
      </button>
      <div className="sr-only" role="status">{pastedNotification ? 'File added from clipboard.' : ''}</div>
      {pastedNotification && <p className="flex items-center gap-2 text-xs text-[#345644] dark:text-[#b4d0b5]" aria-hidden="true"><ClipboardCheck size={14} /> File added from clipboard.</p>}
      {warning && (
        <div id={warningId} role="status" className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
          <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{warning}</span>
        </div>
      )}
    </div>
  );
};
