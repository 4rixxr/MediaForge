const fs=require('node:fs');const fsp=fs.promises;const path=require('node:path');const {spawn}=require('node:child_process');const {pipeline}=require('node:stream/promises');
const kinds=['audio-cd','data-cd','data-dvd','vcd'];
function run(bin,args,{cwd,timeout=2*60*60*1000,onLog,captureAll=false}={}){return new Promise((resolve,reject)=>{const child=spawn(bin,args,{cwd,windowsHide:true,shell:false});let out='',err='';const timer=setTimeout(()=>{child.kill();reject(Error('Proses melewati batas waktu. Hasil belum dinyatakan selesai.'));},timeout);child.stdout.on('data',b=>{out=(out+b).slice(-2000000);});child.stderr.on('data',b=>{err=(err+b).slice(-4000);onLog?.(String(b));});child.on('error',e=>{clearTimeout(timer);reject(Error(path.basename(bin)+' tidak tersedia: '+e.message));});child.on('close',code=>{clearTimeout(timer);if(code===0)resolve(captureAll?out+'\n'+err:out);else reject(Error(path.basename(bin)+' gagal ('+code+'): '+err));});});}
function validateRequest(request){if(!request||!kinds.includes(request.kind))throw Error('Jenis cakram tidak valid.');if(!['pal','ntsc'].includes(request.standard))throw Error('Pilih PAL atau NTSC.');if(!['74','80'].includes(String(request.minutes)))throw Error('Kapasitas CD harus 74 atau 80 menit.');const max=request.kind==='vcd'?98:99;if(!Array.isArray(request.files)||!request.files.length||request.files.length>max||new Set(request.files).size!==request.files.length)throw Error(`Pilih 1–${max} berkas tanpa duplikat.`);return request;}
const cdSectors=minutes=>Number(minutes)*60*75-150;
const msf=frames=>`${String(Math.floor(frames/4500)).padStart(2,'0')}:${String(Math.floor(frames/75)%60).padStart(2,'0')}:${String(frames%75).padStart(2,'0')}`;
function audioCue(names){return names.map((name,i)=>`FILE "${name}" WAVE\n  TRACK ${String(i+1).padStart(2,'0')} AUDIO\n    PREGAP 00:02:00\n    INDEX 01 00:00:00`).join('\n')+'\n';}
async function vcdArgs(input,output,standard,hasAudio){const {vcdVideoFilter}=await import('../shared/media-profiles.js');return ['-y','-i',input,...(hasAudio?[]:['-f','lavfi','-i','anullsrc=r=44100:cl=stereo']),'-map','0:v:0','-map',hasAudio?'0:a:0':'1:a:0','-target',standard==='pal'?'pal-vcd':'ntsc-vcd','-vf',vcdVideoFilter(standard),'-aspect','4:3','-ac','2','-af','apad','-shortest',output];}
async function wavFromPcm(pcm,out){const length=(await fsp.stat(pcm)).size;if(length%2352!==0||length<300*2352)throw Error('Audio CD sector alignment invalid.');const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(length+36,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(2,22);h.writeUInt32LE(44100,24);h.writeUInt32LE(176400,28);h.writeUInt16LE(4,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(length,40);await fsp.writeFile(out,h);await pipeline(fs.createReadStream(pcm),fs.createWriteStream(out,{flags:'a'}));}
async function buildImage(request,files,dir,tools,progress=()=>{}){
 validateRequest(request);if(files.length!==request.files.length)throw Error('Berkas tidak lagi tersedia. Pilih ulang.');
 const imageDir=path.join(dir,'image');await fsp.mkdir(imageDir,{recursive:true});
 if(request.kind.startsWith('data-')){
  const source=path.join(dir,'files');await fsp.mkdir(source);let total=0;const names=new Set();
  for(const file of files){const name=path.basename(file),key=name.toLowerCase();if(names.has(key))throw Error('Nama berkas ganda: '+name);names.add(key);const st=await fsp.stat(file);if(!st.isFile())throw Error('Hanya berkas reguler didukung.');total+=st.size;if(request.kind==='data-cd'&&st.size>=2**32)throw Error('Berkas melebihi batas ISO9660.');}
  const limit=request.kind==='data-cd'?cdSectors(request.minutes)*2048:4700000000;
  if(total+4*1024**2>limit)throw Error('Isi melebihi kapasitas cakram, termasuk ruang untuk filesystem.');
  for(const file of files)await fsp.copyFile(file,path.join(source,path.basename(file)));
  progress('Menyusun filesystem dan image ISO…');const iso=path.join(imageDir,'disc.iso');await tools.iso({source,output:iso,kind:request.kind,label:'MEDIAFORGE',minutes:request.minutes});
  const size=(await fsp.stat(iso)).size;if(size>limit)throw Error('Image melebihi kapasitas cakram.');return {kind:request.kind,dir:imageDir,image:iso,sectors:Math.ceil(size/2048),bytes:size};
 }
 let sectors=0;const tracks=[];const video=[];
 for(let i=0;i<files.length;i++){
  const file=files[i],n=String(i+1).padStart(2,'0');progress(`Menyiapkan trek ${i+1}/${files.length}…`);
  const info=JSON.parse(await run(tools.ffprobe,['-v','error','-show_streams','-show_format','-of','json',file]));
  if(request.kind==='audio-cd'){
   if(!info.streams.some(s=>s.codec_type==='audio'))throw Error('Berkas tidak memiliki audio: '+path.basename(file));
   const pcm=path.join(dir,`track-${n}.pcm`);await run(tools.ffmpeg,['-v','error','-y','-i',file,'-map','0:a:0','-vn','-ar','44100','-ac','2','-c:a','pcm_s16le','-f','s16le',pcm]);
   const size=(await fsp.stat(pcm)).size;const padded=Math.max(300,Math.ceil(size/2352))*2352;await fsp.appendFile(pcm,Buffer.alloc(padded-size));sectors+=padded/2352+150;
   if(sectors>cdSectors(request.minutes))throw Error('Durasi audio dan jeda 2 detik melebihi kapasitas CD.');
   const name=`track-${n}.wav`;await wavFromPcm(pcm,path.join(imageDir,name));tracks.push({pcm,name,sectors:padded/2352});
  }else{
   if(!info.streams.some(s=>s.codec_type==='video'))throw Error('VCD memerlukan trek video: '+path.basename(file));
   const duration=Number(info.format.duration);if(!Number.isFinite(duration)||duration<=0)throw Error('Durasi video tidak dapat dibaca.');sectors+=Math.ceil(duration*75)+150;
   if(sectors>cdSectors(request.minutes)-1000)throw Error('Durasi video melebihi kapasitas VCD.');
   const mpg=path.join(dir,`video-${n}.mpg`);await run(tools.ffmpeg,['-v','error',...await vcdArgs(file,mpg,request.standard,info.streams.some(s=>s.codec_type==='audio'))]);video.push(mpg);
  }
 }
 if(request.kind==='audio-cd'){
  await fsp.writeFile(path.join(imageDir,'disc.cue'),audioCue(tracks.map(t=>t.name)));return {kind:request.kind,dir:imageDir,image:path.join(imageDir,'disc.cue'),tracks,sectors,bytes:sectors*2352};
 }
 if(!tools.vcdimager)throw Error('VCDImager tidak tersedia. Tidak membuat image VCD palsu.');
 progress('Menyusun VCD 2.0, filesystem, dan trek XA…');await run(tools.vcdimager,['--type=vcd2','--cue-file=disc.cue','--bin-file=disc.bin',...video],{cwd:imageDir});
 const bin=path.join(imageDir,'disc.bin'),size=(await fsp.stat(bin)).size;const cue=await fsp.readFile(path.join(imageDir,'disc.cue'),'utf8');if(size%2352||!cue.includes('MODE2/2352'))throw Error('VCD image tidak memiliki sektor XA yang valid.');if(size/2352>cdSectors(request.minutes))throw Error('Image VCD final melebihi kapasitas CD.');
 return {kind:request.kind,dir:imageDir,image:path.join(imageDir,'disc.cue'),sectors:size/2352,bytes:size};
}
function parseScan(output){return output.split(/\r?\n/).flatMap(line=>{const m=line.match(/^\s*((?:(?:[A-Za-z]+):)?\d+,\d+,\d+|[A-Za-z]:|\/dev\/(?:sr|scd|sg)\d+|\/dev\/cdrom)\s+:\s+(.+)$/);return m?[{id:m[1],name:m[2]}]:[];});}
function checkVcdMedia(output,sectors){const blank=/^CD-R empty\s*:\s*yes\s*$/m.test(output);const m=output.match(/^Total Capacity\s*:.*?\((\d+) blocks/m);const capacity=m?Number(m[1]):0;if(!blank||capacity<sectors||capacity>450000)throw Error('VCD memerlukan CD kosong dengan kapasitas yang dapat diverifikasi.');return capacity;}
module.exports={parseScan,checkVcdMedia,run,validateRequest,cdSectors,msf,audioCue,vcdArgs,wavFromPcm,buildImage};
