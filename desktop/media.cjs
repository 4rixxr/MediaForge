const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {run}=require('./burner-core.cjs');
async function convertMedia(request,{ffmpeg,ffprobe},progress=()=>{}){
 const {conversionArgs}=await import('../shared/conversion.js');
 const {audioProfiles,videoProfiles}=await import('../shared/media-profiles.js');
 const {kind,format,options={}}=request||{};
 if(!(request?.bytes instanceof ArrayBuffer)&&!ArrayBuffer.isView(request?.bytes))throw Error('Data berkas tidak valid.');
 if(!request.bytes.byteLength)throw Error('Berkas kosong.');
 conversionArgs(kind,format,options); // Validate before allocating files or invoking FFmpeg.
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mediaforge-convert-'));
 try{
  const input=path.join(dir,'source'),output=path.join(dir,'result.'+format);
  await fs.writeFile(input,ArrayBuffer.isView(request.bytes)?Buffer.from(request.bytes.buffer,request.bytes.byteOffset,request.bytes.byteLength):Buffer.from(request.bytes));
  const info=JSON.parse(await run(ffprobe,['-v','error','-show_streams','-show_format','-of','json',input]));
  const stream=info.streams.find(s=>s.codec_type===(kind==='video'?'video':'audio'));
  if(!stream)throw Error(kind==='video'?'Berkas tidak memiliki video.':'Berkas tidak memiliki audio.');
  const duration=Number(info.format.duration)||Number(stream.duration)||0;
  if(options.startTime&&duration&&options.startTime>=duration)throw Error('Waktu mulai melewati durasi berkas.');
  if(options.crop&&(options.crop.x+options.crop.width>stream.width||options.crop.y+options.crop.height>stream.height))throw Error('Area crop melewati ukuran video.');
  const total=options.endTime?Math.min(duration||options.endTime,options.endTime)-(options.startTime||0):duration-(options.startTime||0);
  let pending='';
  await run(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-progress','pipe:2',...conversionArgs(kind,format,options,input,output)],{onLog:chunk=>{pending+=chunk;const lines=pending.split(/\r?\n/);pending=lines.pop()||'';for(const line of lines){const m=line.match(/^out_time_us=(\d+)/);if(m&&total>0)progress(Math.min(99,Math.max(1,Math.round(Number(m[1])/1000000/total*100))));}}});
  const data=await fs.readFile(output);if(!data.length)throw Error('Encoder menghasilkan berkas kosong.');
  return {bytes:Uint8Array.from(data),mime:(kind==='audio'?audioProfiles[format]:videoProfiles[format]).mime,duration:total};
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}
async function inspectMedia(bytes,{ffprobe}){
 if(!(bytes instanceof ArrayBuffer)&&!ArrayBuffer.isView(bytes))throw Error('Data berkas tidak valid.');
 if(!bytes.byteLength)throw Error('Berkas kosong.');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mediaforge-probe-'));
 try{const input=path.join(dir,'source');await fs.writeFile(input,ArrayBuffer.isView(bytes)?Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength):Buffer.from(bytes));return JSON.parse(await run(ffprobe,['-v','error','-show_streams','-show_format','-of','json',input]));}
 finally{await fs.rm(dir,{recursive:true,force:true});}
}
function registerMedia({ipcMain,getWindow,bundledBin}){
 let chain=Promise.resolve();
 ipcMain.handle('mediaforge:media:inspect',(event,bytes)=>{const w=getWindow();if(!w||event.sender!==w.webContents||event.senderFrame!==w.webContents.mainFrame)throw Error('Invalid media caller.');return inspectMedia(bytes,{ffprobe:bundledBin('ffprobe')});});
 ipcMain.handle('mediaforge:media:convert',(event,id,request)=>{
  const w=getWindow();if(!w||event.sender!==w.webContents||event.senderFrame!==w.webContents.mainFrame)throw Error('Invalid media caller.');
  const task=chain.then(()=>convertMedia(request,{ffmpeg:bundledBin('ffmpeg'),ffprobe:bundledBin('ffprobe')},percent=>{if(!w.isDestroyed())w.webContents.send('mediaforge:media:progress',{id,percent});}));chain=task.catch(()=>{});return task;
 });
}
module.exports={convertMedia,inspectMedia,registerMedia};
