// File.type can be empty on Windows. Keep extension detection consistent across queues.
export function mediaFileCategory(file: Pick<File, 'name' | 'type'>): 'audio'|'video'|'image'|'document'|null {
  const ext=file.name.split('.').pop()?.toLowerCase()||'';
  if(file.type.startsWith('video/')||['mp4','webm','mkv','mov','avi','m4v','ts','mpeg','mpg','mpeg2','dat','wmv'].includes(ext))return 'video';
  if(file.type.startsWith('audio/')||['mp3','wav','aac','flac','m4a','ogg','opus','aiff','aif','wma'].includes(ext))return 'audio';
  if(file.type.startsWith('image/')||['png','jpg','jpeg','webp','bmp','ico','avif','gif','svg'].includes(ext))return 'image';
  if(file.type==='application/pdf'||ext==='pdf')return 'document';
  return null;
}
