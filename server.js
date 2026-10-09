/** MediaForge URL downloader: local-only Node backend. Requires yt-dlp and ffmpeg in PATH.
 * Never bypass DRM, authentication or platform access controls. */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const binaries = {'yt-dlp': process.env.MEDIAFORGE_YTDLP || 'yt-dlp', 'ffmpeg': process.env.MEDIAFORGE_FFMPEG || 'ffmpeg', 'ffprobe': process.env.MEDIAFORGE_FFPROBE || 'ffprobe'};
const PORT = Number(process.env.MEDIAFORGE_PORT || 8787);
const HOST = process.env.MEDIAFORGE_HOST || '127.0.0.1';
const DIST = path.join(ROOT, 'dist');
const active = new Map();
const maxDuration = 10 * 60 * 1000;
const hosts = {
  youtube: ['youtube.com','youtu.be','youtube-nocookie.com','music.youtube.com'],
  bstation: ['bilibili.tv','bstation.tv','bilibili.com','b23.tv'],
  dailymotion: ['dailymotion.com','dai.ly'],
  apple: ['music.apple.com'], tidal: ['tidal.com','listen.tidal.com'], deezer: ['deezer.com','www.deezer.com']
};
function platform(url) {
  let u;
  try { u = new URL(url); } catch { throw Error('URL tidak valid.'); }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) throw Error('Gunakan URL HTTPS publik tanpa kredensial/port.');
  const p = Object.entries(hosts).find(([, list]) => list.some(h => u.hostname === h || u.hostname.endsWith('.' + h)));
  if (!p) throw Error('Platform belum didukung.');
  return p[0];
}
function exec(bin,args, timeout=maxDuration) {
  return new Promise((resolve,reject) => {
    const child=spawn(binaries[bin] || bin,args,{shell:false,windowsHide:true,env:{...process.env,NO_COLOR:'1'}});
    let output='',err='';
    const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Batas waktu proses terlampaui.'));},timeout);
    child.stdout.on('data',b=>{if(output.length<5e6)output+=b.toString();});
    child.stderr.on('data',b=>{if(err.length<1e6)err+=b.toString();});
    child.on('error',e=>{clearTimeout(timer);reject(Error(`${bin} tidak tersedia. Jalankan setup lokal terlebih dahulu.`));});
    child.on('close',code=>{clearTimeout(timer); if(code===0)resolve(output);else reject(Error((err||'Proses gagal.').slice(-1100)));});
  });
}
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function body(req){let s='';for await(const chunk of req){s+=chunk;if(s.length>20000)throw Error('Permintaan terlalu besar.');}return JSON.parse(s||'{}');}
function drmError(p){return ['apple','tidal','deezer'].includes(p) ? 'Layanan musik ini umumnya menggunakan DRM/akses berlisensi. MediaForge tidak mengunduh atau membypass konten terlindungi; gunakan fitur offline resmi layanan tersebut.' : null;}
function formatList(meta){return (meta.formats||[]).filter(f=>f.url).map(f=>({id:f.format_id,ext:f.ext,width:f.width||null,height:f.height||null,fps:f.fps||null,vcodec:f.vcodec,acodec:f.acodec,filesize:f.filesize||f.filesize_approx||null,tbr:f.tbr||null}));}
function safeFile(s){return (s||'media').replace(/[\x00-\x1f<>:"/\\|?*]/g,'_').slice(0,100);}
function estimate(bytes, dur, bitrate){return bytes || (dur&&bitrate ? Math.round(dur*bitrate*1000/8):null);}
function validateOption(data,metadata){
  const {kind,format,resolution,ratio,start,end}=data;
  if(!['audio','video'].includes(kind))throw Error('Jenis keluaran tidak valid.');
  if(!['original','16:9','9:16','1:1','4:3'].includes(ratio))throw Error('Rasio tidak valid.');
  if(kind==='audio' && ratio!=='original')throw Error('Rasio hanya berlaku untuk video.');
  if(!['original','2160','1440','1080','720','480','360'].includes(String(resolution)))throw Error('Resolusi tidak valid.');
  if(kind==='video'&&!['mp4','webm','mkv'].includes(format))throw Error('Format video tidak valid.');
  if(kind==='audio'&&!['original','mp3','m4a','flac','wav','opus'].includes(format))throw Error('Format audio tidak valid.');
  if(start === null || end === null || start === '' || end === '')throw Error('Rentang waktu tidak valid.');
  const a=Number(start),b=Number(end);
  if(!Number.isFinite(a)||a<0||!Number.isFinite(b)||b<0|| (b>0&&b<=a))throw Error('Rentang pemotongan tidak valid.');
  if(metadata.duration && (a>=metadata.duration || (b>0&&b>metadata.duration+1)))throw Error('Waktu potong melebihi durasi.');
  return {a,b};
}
async function handle(req,res){
  const route=new URL(req.url||'/',`http://${HOST}:${PORT}`).pathname;
  if(req.method==='POST' && (route==='/api/url/info'||route==='/api/url/download')){
    const origin = req.headers.origin;
    if (origin && origin !== `http://${HOST}:${PORT}`) return send(res,403,{error:'Permintaan dari origin lain ditolak.'});
    if (req.headers['content-type']?.split(';')[0]?.trim() !== 'application/json') return send(res,415,{error:'Hanya permintaan JSON yang didukung.'});
    try{
      const input=await body(req);
      const p=platform(input.url);
      const restricted=drmError(p);
      if(restricted)return send(res,422,{error:restricted,platform:p,restricted:true});
      const raw=await exec('yt-dlp',['--no-playlist','--no-warnings','--skip-download','--dump-single-json','--no-call-home','--',input.url],90000);
      const meta=JSON.parse(raw);
      if(meta.is_live)throw Error('Live streaming belum didukung.');
      const info={title:meta.title||'Untitled',duration:meta.duration||0,thumbnail:meta.thumbnail||null,platform:p,formats:formatList(meta),originalWidth:meta.width||null,originalHeight:meta.height||null};
      if(route.endsWith('/info'))return send(res,200,info);
      const {a,b}=validateOption(input,info);
      const temp=await mkdtemp(path.join(os.tmpdir(),'mf-url-'));
      const token=randomUUID();active.set(token,{temp,created:Date.now()});
      try{
        const output=path.join(temp,'download.%(ext)s');
        const args=['--no-playlist','--no-warnings','--no-call-home','--no-part','-o',output];
        const isAudio=input.kind==='audio';
        if(isAudio){
          if(input.format==='original')args.push('-f','bestaudio/best');
          else {args.push('-f','bestaudio/best','-x','--audio-format',input.format,'--audio-quality','0');}
        }else{
          const cap=input.resolution==='original'?'':`[height<=${input.resolution}]`;
          args.push('-f',`bestvideo${cap}+bestaudio/best${cap}/best`,'--merge-output-format',input.format);
          if(input.format==='mp4')args.push('--recode-video','mp4');
          if(input.format==='webm')args.push('--recode-video','webm');
        }
        if(a>0||b>0)args.push('--download-sections',`*${a||0}-${b||'inf'}`,'--force-keyframes-at-cuts');
        args.push('--',input.url);
        await exec('yt-dlp',args);
        const files=(await readdir(temp)).filter(n=>!n.endsWith('.part')&&!n.endsWith('.ytdl'));
        const candidate=files.find(n=>n.startsWith('download.'));
        if(!candidate)throw Error('Berkas tidak ditemukan setelah pengunduhan.');
        let file=path.join(temp,candidate);
        // Filter crop/scale and container correction after download; FFmpeg re-encodes video when needed.
        const edited=input.kind==='video' && input.ratio!=='original';
        if(edited){
          const desired=input.ratio==='original'?null:input.ratio.split(':').map(Number);
          const vf=[];
          if(desired){const [w,h]=desired;vf.push(`crop='min(iw,ih*${w}/${h})':'min(ih,iw*${h}/${w})'`);}
          // Resolution is already capped during stream selection. Avoid needless re-encoding.
          const out=path.join(temp,`final.${input.format}`);
          const codec=input.format==='webm'?['-c:v','libvpx-vp9','-c:a','libopus']:['-c:v','libx264','-crf','18','-preset','medium','-c:a','aac','-b:a','192k'];
          await exec('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',file,'-vf',vf.join(','),...codec,out]);
          file=out;
        }
        const st=await stat(file);
        const ext=path.extname(file);
        res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':st.size,'Content-Disposition':`attachment; filename="${safeFile(info.title).replace(/[^\x20-\x7e]/g,'_')} ${ext}"`.replace(' '+ext,ext),'Cache-Control':'no-store'});
        const stream=createReadStream(file);
        stream.on('error',()=>res.destroy());
        stream.on('close',async()=>{active.delete(token);await rm(temp,{recursive:true,force:true});});
        stream.pipe(res);
      }catch(err){active.delete(token);await rm(temp,{recursive:true,force:true});throw err;}
    }catch(err){if(!res.headersSent)send(res,400,{error:err.message||'Gagal memproses URL.'});}
    return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Metode tidak diizinkan.'});
  try{
    let file=path.resolve(DIST,'.'+decodeURIComponent(route));
    if(!file.startsWith(DIST+path.sep)&&file!==DIST)return send(res,403,{error:'Forbidden'});
    const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon'};
    let st;try{st=await stat(file);if(st.isDirectory())throw Error('directory');}catch{file=path.join(DIST,'index.html');st=await stat(file);}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':st.size,'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'credentialless'});
    if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
  }catch{send(res,404,{error:'Build tidak ditemukan. Jalankan npm run build.'});}
}
http.createServer((req,res)=>{handle(req,res).catch(e=>{if(!res.headersSent)send(res,500,{error:e.message});});}).listen(PORT,HOST,()=>console.log(`MediaForge: http://${HOST}:${PORT}`));
