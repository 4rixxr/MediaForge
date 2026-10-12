import {useLanguage} from '../../context/LanguageContext';
import React, {useRef, useState} from 'react';
import {ArrowRightLeft, AudioLines, Check, CheckCircle2, Clapperboard, Download, FileAudio, FileVideo, FolderOpen, HardDrive, LoaderCircle, Music2, Pause, Play, Plus, RotateCcw, Sparkles, Trash2, UploadCloud, WandSparkles, X} from 'lucide-react';
import {useQueue} from '../../context/QueueContext';
import {useHistory} from '../../context/HistoryContext';
import {ConversionMode, QueueJob} from '../../types/media';
import {demoAudio, demoVideo} from './demoMedia';
import './converter.css';

const modes = [
  {id:'audio-audio',name:'Audio → Audio',detail:'MP3, WAV, AAC, FLAC',Icon:Music2},
  {id:'video-audio',name:'Video → Audio',detail:'Ekstrak trek suara',Icon:AudioLines},
  {id:'video-video',name:'Video → Video',detail:'MP4, WEBM, MKV, MOV',Icon:Clapperboard},
  {id:'audio-video',name:'Audio → Video',detail:'Audio dengan latar video',Icon:FileVideo},
] as const;
const sizes=(bytes:number)=>bytes===0?'0 MB':bytes<1024**2?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1024**2).toFixed(1)} MB`;
const statuses:Record<QueueJob['status'],string>={waiting:'Menunggu',processing:'Diproses',completed:'Selesai',failed:'Gagal',cancelled:'Dibatalkan'};
const matchesMode=(file:File,mode:ConversionMode)=>{
  const ext=file.name.split('.').pop()?.toLowerCase()||'';
  return mode.startsWith('audio') ? file.type.startsWith('audio/')||['mp3','wav','aac','flac','m4a','ogg','opus','aiff'].includes(ext) : file.type.startsWith('video/')||['mp4','webm','mkv','mov','avi','m4v','ts'].includes(ext);
};

export function ConverterWorkspace() {
  const {t,language}=useLanguage();
  const {jobs,addJobs,startJob,startAllWaitingJobs,pauseQueue,isQueuePaused,isProcessingAny,removeJob,clearCompletedJobs,downloadJobOutput,downloadAllCompletedAsZip}=useQueue();
  const {history}=useHistory();
  const [mode,setMode]=useState<ConversionMode>('audio-audio');
  const [format,setFormat]=useState('mp3');
  const [quality,setQuality]=useState('192');
  const [channels,setChannels]=useState('2');
  const [fps,setFps]=useState('30');
  const [files,setFiles]=useState<File[]>([]);
  const [filter,setFilter]=useState('all');
  const [dragging,setDragging]=useState(false);
  const [error,setError]=useState('');
  const [makingSample,setMakingSample]=useState(false);
  const input=useRef<HTMLInputElement>(null);
  const isAudioOutput=mode.endsWith('audio');
  const audioInput=mode.startsWith('audio');
  const lossless=format==='wav'||format==='flac';
  const completed=jobs.filter(j=>j.status==='completed');
  const processing=jobs.filter(j=>j.status==='processing');
  const waiting=jobs.filter(j=>j.status==='waiting');
  const visible=jobs.filter(j=>filter==='all'||(filter==='processing'?j.status==='processing':j.status==='completed'));
  const today=new Date().toDateString();
  const todaysHistory=history.filter(h=>new Date(h.timestamp).toDateString()===today);
  const sourceSize=jobs.reduce((n,j)=>n+j.fileSize,0)+files.reduce((n,f)=>n+f.size,0);
  const formats=isAudioOutput?['mp3','wav','aac','flac','m4a','ogg','opus']:mode==='audio-video'?['mp4','webm']:['mp4','webm','mkv','mov','avi'];
  const selectMode=(next:ConversionMode)=>{
    if(next===mode)return;
    const kept=files.filter(f=>matchesMode(f,next));
    setFiles(kept);setError(kept.length!==files.length?t('Berkas yang tidak sesuai mode baru dilepas dari pilihan.'):'');
    setMode(next);setFormat(next.endsWith('audio')?'mp3':'mp4');setQuality(next.endsWith('audio')?'192':'2500');setChannels('2');setFps('30');
  };
  const addFiles=(incoming:File[])=>{
    const accepted=incoming.filter(f=>matchesMode(f,mode));
    setError(accepted.length!==incoming.length?t(audioInput?'Pilih berkas audio yang sesuai dengan mode ini.':'Pilih berkas video yang sesuai dengan mode ini.'):'');
    setFiles(previous=>[...previous,...accepted.filter(f=>!previous.some(p=>p.name===f.name&&p.size===f.size&&p.lastModified===f.lastModified))]);
  };
  const addSample=async()=>{
    setMakingSample(true);setError('');
    try{addFiles([audioInput?demoAudio():await demoVideo()]);}catch(e){setError(e instanceof Error?e.message:'Contoh berkas gagal dibuat.');}finally{setMakingSample(false);}
  };
  const convert=()=>{
    if(files.length){
      addJobs(files,format,{mode,bitrate:isAudioOutput&&!lossless?Number(quality):undefined,channels:isAudioOutput?Number(channels) as 1|2:undefined,videoBitrate:!isAudioOutput?Number(quality)*1000:undefined,fps:!isAudioOutput?Number(fps):undefined});
      setFiles([]);setFilter('all');
    }
    void startAllWaitingJobs();
  };
  const reset=()=>{setFormat(isAudioOutput?'mp3':'mp4');setQuality(isAudioOutput?'192':'2500');setChannels('2');setFps('30');setError('');};
  return <div className="cv-page">
    <div className="cv-toolbar">
      <div className="cv-tabs" role="group" aria-label="Filter antrean">
        {[['all','Semua',jobs.length],['processing','Diproses',processing.length],['completed','Selesai',completed.length]].map(([id,label,count])=><button key={id} type="button" aria-pressed={filter===id} onClick={()=>setFilter(String(id))}>{t(String(label))}<span>{count}</span></button>)}
      </div>
      <div className="cv-toolbar-actions">
        <button className="cv-button" disabled={!waiting.length&&!isProcessingAny} onClick={()=>isQueuePaused?void startAllWaitingJobs():pauseQueue()} title="Jeda berlaku setelah berkas aktif selesai">{isQueuePaused?<Play size={13}/>:<Pause size={13}/>}<span>{t(isQueuePaused?'Lanjutkan':'Jeda antrean')}</span></button>
        <button className="cv-button cv-primary" onClick={convert} disabled={!files.length&&!waiting.length}><Play size={13}/>{t('Mulai konversi')}</button>
      </div>
    </div>
    <div className="cv-content">
      <section className="cv-stat-grid" aria-label="Ringkasan konversi">
        {[
          {label:'KONVERSI HARI INI',value:todaysHistory.length,badge:'hari ini',note:t('{count} tugas diselesaikan',{count:todaysHistory.length}),Icon:ArrowRightLeft,tone:'green'},
          {label:'SEDANG DIPROSES',value:processing.length,badge:'berjalan',note:t('{count} menunggu giliran',{count:waiting.length}),Icon:LoaderCircle,tone:'green'},
          {label:'SELESAI',value:completed.length,badge:'siap unduh',note:t('{count} berkas hasil',{count:completed.length}),Icon:CheckCircle2,tone:'green'},
          {label:'UKURAN SUMBER',value:sizes(sourceSize),badge:'total',note:'4 mode konversi tersedia',Icon:HardDrive,tone:'gold'},
        ].map(({label,value,badge,note,Icon,tone})=><article className="cv-stat" key={t(label)}><div className="cv-stat-inner"><div><p>{t(label)}</p><div className="cv-stat-value"><strong>{value}</strong><span className={`cv-badge ${tone}`}>{tone==='gold'?<HardDrive size={10}/>:<CheckCircle2 size={10}/>} {t(badge)}</span></div></div><span className="cv-icon-tile"><Icon size={18} strokeWidth={1.5}/></span></div><p className="cv-stat-foot">{t(note)}</p></article>)}
      </section>
      <section className="cv-panel cv-work-panel" aria-labelledby="cv-work-title">
        <div className="cv-panel-title"><div><p className="cv-eyebrow">{t('RUANG KERJA')}</p><h2 id="cv-work-title">{t('Siapkan berkas')}</h2></div><span className="cv-icon-tile"><WandSparkles size={18} strokeWidth={1.5}/></span></div>
        <div className="cv-work-grid">
          <div className="cv-source">
            <p className="cv-field-caption">{t('MODE KONVERSI')}</p>
            <div className="cv-modes" role="group" aria-label="Mode konversi">{modes.map(({id,name,detail,Icon})=><button type="button" key={id} className={mode===id?'selected':''} aria-pressed={mode===id} onClick={()=>selectMode(id)} disabled={makingSample}><Icon size={14}/><span><strong>{t(name)}</strong><small>{t(detail)}</small></span></button>)}</div>
            <div className={`cv-dropzone${dragging?' dragging':''}`} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);addFiles(Array.from(e.dataTransfer.files));}}>
              <UploadCloud size={21} strokeWidth={1.3}/><strong>{files.length?t('{count} berkas siap dikonversi',{count:files.length}):t('Tarik berkas ke sini')}</strong>
              <p>{t(audioInput?'Format audio: MP3, WAV, AAC, FLAC, M4A':'Format video: MP4, WEBM, MKV, MOV, AVI')}</p>
              <div><button className="cv-button cv-primary" onClick={()=>input.current?.click()}><FolderOpen size={13}/>{t('Pilih berkas')}</button><button className="cv-button" disabled={makingSample} onClick={()=>void addSample()}>{makingSample?<LoaderCircle size={13} className="cv-spin"/>:<Sparkles size={13}/>}Contoh berkas</button></div>
              <input ref={input} type="file" aria-label="Pilih berkas media" accept={audioInput?'audio/*,.mp3,.wav,.aac,.flac,.m4a,.ogg,.opus,.aiff':'video/*,.mp4,.webm,.mkv,.mov,.avi,.m4v,.ts'} multiple hidden onChange={e=>{addFiles(Array.from(e.target.files||[]));e.target.value='';}}/>
            </div>
            {files.length>0&&<ul className="cv-selected-files" aria-label="Berkas terpilih">{files.map((f,i)=><li key={`${f.name}-${i}`}><span title={f.name}>{f.name}</span><small>{sizes(f.size)}</small><button aria-label={`Hapus pilihan ${f.name}`} onClick={()=>setFiles(value=>value.filter((_,n)=>n!==i))}><X size={13}/></button></li>)}</ul>}
            <p className="cv-privacy">{t('Berkas diproses di perangkat kamu.')}<br/>{t('Konversi dan antrean berjalan secara lokal.')}</p>
          </div>
          <div className="cv-settings">
            <label className="cv-format-label">{t('Format keluaran')}<select aria-label="Format keluaran" value={format} onChange={e=>setFormat(e.target.value)}>{formats.map(f=><option key={f} value={f}>{f.toUpperCase()}{f==='wav'?' · '+t('audio tanpa kompresi'):f==='flac'?' · lossless':''}</option>)}</select></label>
            <div className="cv-settings-row"><label>{t('Kualitas')}<select aria-label="Kualitas" value={lossless?'lossless':quality} disabled={lossless} onChange={e=>setQuality(e.target.value)}>{lossless?<option value="lossless">{format==='wav'?'PCM 16-bit':'Lossless'}</option>:isAudioOutput?[128,192,256,320].map(n=><option value={n} key={n}>{n} kbps</option>):[1500,2500,5000,8000].map(n=><option value={n} key={n}>{n/1000} Mbps</option>)}</select></label>{isAudioOutput?<label>{t('Kanal')}<select aria-label="Kanal" value={channels} onChange={e=>setChannels(e.target.value)}><option value="2">{t('Stereo')}</option><option value="1">{t('Mono')}</option></select></label>:<label>{t('Frame rate')}<select aria-label="Frame rate" value={fps} onChange={e=>setFps(e.target.value)}>{[24,25,30,60].map(n=><option value={n} key={n}>{n} fps</option>)}</select></label>}</div>
            <div className="cv-summary"><p><span>{t('Berkas siap')}</span><strong>{t('{count} berkas',{count:files.length})}</strong></p><p><span>{t('Perkiraan ukuran hasil')}</span><span>{files.length?t('Setelah pemrosesan'):'—'}</span></p><p><span>{t('Estimasi waktu')}</span><span>{files.length?t('Bergantung perangkat'):'—'}</span></p></div>
            {mode==='audio-video'&&<p className="cv-option-note">{t('Video 720p dengan latar polos dan audio pilihanmu.')}</p>}
            <div className="cv-settings-actions"><button className="cv-button cv-reset" onClick={reset}><RotateCcw size={13}/>{t('Reset pengaturan')}</button><button className="cv-button cv-primary" disabled={!files.length} onClick={convert}><Play size={13}/>{t('Konversi sekarang')}</button></div>
          </div>
        </div>
        {error&&<p className="cv-error" role="alert">{error}</p>}
      </section>
      <section className="cv-panel cv-queue-panel" aria-labelledby="cv-queue-title">
        <div className="cv-panel-title"><div><p className="cv-eyebrow">{t('ANTREAN')}</p><h2 id="cv-queue-title">{t('Antrean konversi')}</h2></div><div className="cv-title-actions">{completed.length>0&&<button className="cv-button" onClick={()=>void downloadAllCompletedAsZip()}><Download size={13}/>{t('Unduh hasil')}</button>}<button className="cv-button" disabled={!completed.length} onClick={clearCompletedJobs}><Trash2 size={13}/>{t('Bersihkan selesai')}</button></div></div>
        {isQueuePaused&&<p className="cv-pause-note" role="status">{t('Antrean dijeda. Berkas yang sedang diproses akan diselesaikan terlebih dahulu.')}</p>}
        {visible.length===0?<div className="cv-empty"><span className="cv-empty-mark"><ArrowRightLeft size={19} strokeWidth={1.2}/></span><strong>{t(jobs.length?'Tidak ada tugas pada filter ini':'Belum ada tugas')}</strong><p>{t('Tambahkan berkas di ruang kerja lalu tekan Konversi sekarang.')}</p></div>:<ul className="cv-job-list">{visible.map(job=><li className="cv-job" key={job.id}>
          <span className="cv-file-icon">{job.category==='audio'?<FileAudio size={18}/>:<FileVideo size={18}/>}</span><div className="cv-job-main"><strong>{job.fileName}</strong><small>{sizes(job.fileSize)} <span>→</span> {job.targetFormat.toUpperCase()} {job.settings?.channels?`· ${t(job.settings.channels===1?'Mono':'Stereo')}`:''}</small>{job.status==='processing'&&<progress value={job.progress} max={100} aria-label={`Progres ${job.fileName}`}/>} {job.errorMessage&&<p className="cv-job-error">{job.errorMessage}</p>}</div>
          <span className={`cv-status ${job.status}`}>{job.status==='processing'?`${Math.round(job.progress)}%`:t(statuses[job.status])}</span><div className="cv-job-actions">{job.status==='completed'?<button className="cv-button" aria-label={`Unduh ${job.fileName}`} onClick={()=>downloadJobOutput(job.id)}><Download size={14}/></button>:job.status!=='processing'&&<button className="cv-button" aria-label={`Proses ${job.fileName}`} onClick={()=>void startJob(job.id)}><Play size={14}/></button>}{job.status!=='processing'&&<button className="cv-icon-button" aria-label={`Hapus ${job.fileName}`} onClick={()=>removeJob(job.id)}><X size={14}/></button>}</div>
        </li>)}</ul>}
      </section>
      <section className="cv-panel cv-history-panel" aria-labelledby="cv-history-title"><div className="cv-panel-title"><div><p className="cv-eyebrow">{t('RIWAYAT')}</p><h2 id="cv-history-title">{t('Konversi selesai')}</h2></div><span className="cv-history-count">{history.length?t('{count} konversi',{count:history.length}):''}</span></div><div className="cv-table-wrap"><table><thead><tr><th>{t('Berkas')}</th><th>{t('Konversi')}</th><th>{t('Ukuran')}</th><th>{t('Selesai')}</th><th>{t('Status')}</th></tr></thead><tbody>{history.slice(0,8).map(item=><tr key={item.id}><td title={item.outputFileName}>{item.outputFileName}</td><td>{item.inputFormat} <span>→</span> {item.outputFormat}</td><td>{sizes(item.outputSize)}</td><td>{new Date(item.timestamp).toLocaleString(language==='zh'?'zh-CN':language,{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td><td><span className="cv-badge green"><Check size={11}/>{t('Selesai')}</span></td></tr>)}{history.length===0&&<tr><td className="cv-history-empty" colSpan={5}>{t('Hasil konversi akan muncul di sini.')}</td></tr>}</tbody></table></div></section>
    </div>
  </div>;
}
