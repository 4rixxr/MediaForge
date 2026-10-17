/** MediaForge URL downloader: local-only Node backend. Requires yt-dlp and ffmpeg in PATH.
 * Never bypass DRM, authentication or platform access controls. */
import http from 'node:http';
import {audioArgs,audioProfiles,videoArgs} from './shared/media-profiles.js';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, stat } from 'node:fs/promises';
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
// Electron's executable is not a standalone Node CLI. Windows ships node.exe.
const jsRuntime = process.env.MEDIAFORGE_JS_RUNTIME || (!process.versions.electron ? `node:${process.execPath}` : null);
const extractorArgs = () => ['--ignore-config','--no-playlist','--no-progress','--encoding','utf-8','--socket-timeout','30','--retries','3',...(jsRuntime?['--js-runtimes',jsRuntime]:[])];
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
  if(kind==='video'&&!['mp4','webm','mkv','mpeg','mpeg2','dat'].includes(format))throw Error('Format video tidak valid.');
  if(kind==='audio'&&format!=='original'&&!audioProfiles[format])throw Error('Format audio tidak valid.');
  if(kind==='audio'&&format!=='original')audioArgs(format,{bitrate:data.bitrate,quality:data.quality});
  if(start === null || end === null || start === '' || end === '')throw Error('Rentang waktu tidak valid.');
  const a=Number(start),b=Number(end);
  if(!Number.isFinite(a)||a<0||!Number.isFinite(b)||b<0|| (b>0&&b<=a))throw Error('Rentang pemotongan tidak valid.');
  if(metadata.duration && (a>=metadata.duration || (b>0&&b>metadata.duration+1)))throw Error('Waktu potong melebihi durasi.');
  return {a,b};
}
async function handle(req,res,run=exec){
  const route=new URL(req.url||'/',`http://${HOST}:${PORT}`).pathname;
  if(req.method==='POST' && (route==='/api/url/info'||route==='/api/url/download')){
    const origin = req.headers.origin;
    if (origin && ![`http://127.0.0.1:${req.socket.localPort}`,`http://localhost:${req.socket.localPort}`,`http://[::1]:${req.socket.localPort}`].includes(origin)) return send(res,403,{error:'Permintaan dari origin lain ditolak.'});
    if (req.headers['content-type']?.split(';')[0]?.trim() !== 'application/json') return send(res,415,{error:'Hanya permintaan JSON yang didukung.'});
    try{
      const input=await body(req);
      if(typeof input.url==='string')input.url=input.url.trim();
      const p=platform(input.url);
      const restricted=drmError(p);
      if(restricted)return send(res,422,{error:restricted,platform:p,restricted:true});
      if(route.endsWith('/download'))validateOption(input,{});
      const raw=await run('yt-dlp',[...extractorArgs(),'--skip-download','--dump-single-json','--',input.url],90000);
      const meta=JSON.parse(raw);
      if(meta.is_live)throw Error('Live streaming belum didukung.');
      const info={title:meta.title||'Untitled',duration:meta.duration||0,thumbnail:meta.thumbnail||null,platform:p,formats:formatList(meta),originalWidth:meta.width||null,originalHeight:meta.height||null};
      if(route.endsWith('/info'))return send(res,200,info);
      const {a,b}=validateOption(input,info);
      const temp=await mkdtemp(path.join(os.tmpdir(),'mf-url-'));
      const token=randomUUID();active.set(token,{temp,created:Date.now()});
      try{
        const output=path.join(temp,'download.%(ext)s');
        const args=[...extractorArgs(),'--no-part','--no-simulate','--print','after_move:%(filepath)j','-o',output];
        // yt-dlp does not understand MEDIAFORGE_FFMPEG. Pass its bundled path explicitly.
        if (process.env.MEDIAFORGE_FFMPEG) args.push('--ffmpeg-location', path.dirname(binaries.ffmpeg));
        const isAudio=input.kind==='audio';
        if(isAudio){
          if(input.format==='original')args.push('-f','bestaudio/best','-x','--audio-format','best');
          else {args.push('-f','bestaudio/best','-x','--audio-format','best');}
        }else{
          const cap=input.resolution==='original'?'':`[height<=${input.resolution}]`;
          // Prefer bounded streams, but scale locally if the site only offers larger ones.
          // The video-only fallback also permits silent videos.
          args.push('-f',`bestvideo${cap}+bestaudio/best${cap}/bestvideo${cap}/bestvideo+bestaudio/best/bestvideo`,'--merge-output-format','mkv','--remux-video','mkv');
        }
        args.push('--',input.url);
        const downloaded=await run('yt-dlp',args);
        const paths=downloaded.trim().split(/\r?\n/).flatMap(line=>{try{const value=JSON.parse(line);return typeof value==='string'?[value]:[];}catch{return [];}});
        let file=paths.at(-1);
        if(!file||path.dirname(path.resolve(file))!==path.resolve(temp))throw Error('yt-dlp tidak mengembalikan lokasi berkas final yang valid.');
        const source=await stat(file);if(!source.isFile()||!source.size)throw Error('Berkas unduhan kosong atau tidak tersedia.');
        const trim=[...(a>0?['-ss',String(a)]:[]),...(b>0?['-t',String(b-a)]:[])];
        if(isAudio&&(input.format!=='original'||trim.length)){const out=path.join(temp,'audio.'+(input.format==='original'?path.extname(file).slice(1):input.format));await run('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-i',file,...trim,'-map','0:a:0','-vn',...(input.format==='original'?['-c:a','copy']:audioArgs(input.format,{bitrate:input.bitrate,quality:input.quality})),out]);file=out;}
        // Filter crop/scale and container correction after download; FFmpeg re-encodes video when needed.
        const edited=input.kind==='video';
        if(edited){
          const desired=input.ratio==='original'?null:input.ratio.split(':').map(Number);
          const vf=[];
          if(desired){const [w,h]=desired;vf.push(`crop='trunc(min(iw,ih*${w}/${h})/2)*2':'trunc(min(ih,iw*${h}/${w})/2)*2'`);}
          if(input.resolution!=='original'&&input.format!=='dat')vf.push(`scale=w=-2:h='min(ih,${Number(input.resolution)})'`);
          if(input.format!=='dat')vf.push('pad=ceil(iw/2)*2:ceil(ih/2)*2');
          const out=path.join(temp,`final.${input.format}`);
          const codec=['mpeg','mpeg2','dat'].includes(input.format)?videoArgs(input.format,{bitrate:2500000}):input.format==='webm'?['-c:v','libvpx-vp9','-crf','30','-b:v','0','-deadline','good','-cpu-used','4','-c:a','libopus','-b:a','128k']:['-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-preset','fast','-c:a','aac','-b:a','192k',...(input.format==='mp4'?['-movflags','+faststart']:[])];
          // A second -vf would replace the requested crop for the fixed VCD profile.
          const profileFilter=codec.indexOf('-vf');
          if(profileFilter>=0)vf.push(codec.splice(profileFilter,2)[1]);
          await run('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-i',file,...trim,'-map','0:v:0','-map','0:a:0?',...(vf.length?['-vf',vf.join(',')]:[]),...codec,out]);
          file=out;
        }
        const st=await stat(file);if(!st.size)throw Error('Berkas keluaran kosong.');
        const ext=path.extname(file);
        res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':st.size,'Content-Disposition':`attachment; filename="${safeFile(info.title).replace(/[^\x20-\x7e]/g,'_')} ${ext}"`.replace(' '+ext,ext),'Cache-Control':'no-store'});
        const stream=createReadStream(file);
        stream.on('error',()=>res.destroy());
        res.on('close',()=>stream.destroy());
        stream.on('close',()=>{active.delete(token);rm(temp,{recursive:true,force:true}).catch(console.error);});
        stream.pipe(res);
      }catch(err){active.delete(token);await rm(temp,{recursive:true,force:true});throw err;}
    }catch(err){if(!res.headersSent)send(res,400,{error:err.message||'Gagal memproses URL.'});}
    return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Metode tidak diizinkan.'});
  try{
    let file=path.resolve(DIST,'.'+decodeURIComponent(route));
    if(!file.startsWith(DIST+path.sep)&&file!==DIST)return send(res,403,{error:'Forbidden'});
    const types={'.html':'text/html','.js':'text/javascript','.wasm':'application/wasm','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon'};
    let st;try{st=await stat(file);if(st.isDirectory())throw Error('directory');}catch{file=path.join(DIST,'index.html');st=await stat(file);}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':st.size,'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'credentialless'});
    if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
  }catch{send(res,404,{error:'Build tidak ditemukan. Jalankan npm run build.'});}
}
export function startServer({port=PORT, host=HOST, run=exec}={}) {
  return new Promise((resolve, reject) => {
    const server=http.createServer((req,res)=>{handle(req,res,run).catch(e=>{if(!res.headersSent)send(res,500,{error:e.message});else res.destroy();});});
    server.once('error',reject);
    server.listen(port,host,()=>{
      server.removeListener('error',reject);
      resolve(server);
    });
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().then(server=>console.log(`MediaForge: http://${HOST}:${server.address().port}`)).catch(error=>{
    console.error('Server MediaForge gagal dimulai:',error.message);process.exitCode=1;
  });
}
