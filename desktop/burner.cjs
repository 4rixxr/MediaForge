const path=require('node:path');const fs=require('node:fs');const fsp=fs.promises;const os=require('node:os');const {randomUUID}=require('node:crypto');const {run,validateRequest,buildImage,parseScan,checkVcdMedia}=require('./burner-core.cjs');
function registerBurner({app,ipcMain,dialog,getWindow,bundledBin}){
 const selected=new Map(),projects=new Map();let busy=false;
 const workRoot=path.join(app.getPath('temp'),'mediaforge-burner-'+process.pid);
 const ps=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
 const opticalScript=()=>app.isPackaged?path.join(process.resourcesPath,'optical','optical.ps1'):path.join(__dirname,'optical.ps1');
 const emit=message=>{const w=getWindow();if(w&&!w.isDestroyed())w.webContents.send('mediaforge:burner:progress',{message});};
 async function optical(request){await fsp.mkdir(workRoot,{recursive:true});const file=path.join(workRoot,randomUUID()+'.json');await fsp.writeFile(file,JSON.stringify(request));try{return JSON.parse((await run(ps,['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-Sta','-File',opticalScript(),'-RequestFile',file])).replace(/^\uFEFF/,''));}finally{await fsp.rm(file,{force:true});}}
 const cdrdao=()=>{const f=path.join(path.dirname(bundledBin('ffmpeg')),'cdrdao','cdrdao.exe');return fs.existsSync(f)?f:null;};
 async function scanVcd(){if(!cdrdao())return [];return parseScan(await run(cdrdao(),['scanbus'],{captureAll:true,timeout:30000}));}
 const tools=()=>({ffmpeg:bundledBin('ffmpeg'),ffprobe:bundledBin('ffprobe'),vcdimager:fs.existsSync(bundledBin('vcdimager'))?bundledBin('vcdimager'):null,iso:r=>optical({action:'iso',...r})});
 // Only this window and its main frame can invoke filesystem/optical operations.
 function handle(name,fn){ipcMain.handle('mediaforge:burner:'+name,async(event,...args)=>{const w=getWindow();if(!w||event.sender!==w.webContents||event.senderFrame!==w.webContents.mainFrame)throw Error('Invalid burner caller.');return fn(...args);});}
 async function exclusive(fn){if(busy)throw Error('Operasi burner masih berjalan.');busy=true;try{return await fn();}finally{busy=false;}}
 handle('status',async()=>{const result=await optical({action:'probe'});let vcdDrives=[],vcdError='';try{vcdDrives=await scanVcd();}catch(e){vcdError=String(e.message);}return {...result,vcdImage:!!tools().vcdimager,physicalVcd:!!cdrdao(),vcdDrives,vcdError};});
 handle('choose',async()=>{const result=await dialog.showOpenDialog(getWindow(),{title:'Pilih berkas untuk cakram',properties:['openFile','multiSelections']});if(result.canceled)return [];const files=[];for(const file of result.filePaths){const st=await fsp.stat(file);if(!st.isFile())continue;const id=randomUUID();selected.set(id,file);files.push({id,name:path.basename(file),bytes:st.size});}return files;});
 handle('build',request=>exclusive(async()=>{validateRequest(request);const files=request.files.map(id=>selected.get(id));if(files.some(f=>!f))throw Error('Berkas pilihan tidak tersedia.');if(request.kind==='vcd'&&!tools().vcdimager)throw Error('VCDImager tidak tersedia dalam instalasi ini.');
  await fsp.mkdir(workRoot,{recursive:true});const dir=await fsp.mkdtemp(path.join(workRoot,'project-'));
  try{const project=await buildImage(request,files,dir,tools(),emit);const id=randomUUID();projects.set(id,{...project,work:dir});emit('Image selesai dibuat. Belum ada cakram fisik yang ditulis.');return {id,kind:project.kind,bytes:project.bytes,sectors:project.sectors,imageType:request.kind==='vcd'?'BIN/CUE':request.kind==='audio-cd'?'CUE/WAV':'ISO'};}catch(e){await fsp.rm(dir,{recursive:true,force:true});throw e;}
 }));
 handle('save',id=>exclusive(async()=>{const project=projects.get(id);if(!project)throw Error('Image tidak tersedia.');
  if(project.image.endsWith('.iso')){const result=await dialog.showSaveDialog(getWindow(),{defaultPath:'MediaForge-'+project.kind+'.iso',filters:[{name:'Disc image',extensions:['iso']}]});if(result.canceled||!result.filePath)return null;await fsp.copyFile(project.image,result.filePath);return result.filePath;}
  const result=await dialog.showOpenDialog(getWindow(),{title:'Pilih folder tujuan image beserta semua trek',properties:['openDirectory','createDirectory']});if(result.canceled)return null;
  const destination=path.join(result.filePaths[0],'MediaForge-'+project.kind+'-'+randomUUID().slice(0,8));await fsp.cp(project.dir,destination,{recursive:true,errorOnExist:true,force:false});return destination;
 }));
 handle('burn',(id,drive)=>exclusive(async()=>{const project=projects.get(id);if(!project)throw Error('Image tidak tersedia.');if(project.kind==='vcd'){
   if(!cdrdao())throw Error('CDRDAO tidak tersedia. Simpan BIN/CUE.');
   const recorder=(await scanVcd()).find(d=>d.id===drive);if(!recorder)throw Error('Drive VCD tidak terdeteksi.');
   const check=async()=>checkVcdMedia(await run(cdrdao(),['disk-info','--device',drive],{captureAll:true,timeout:60000}),project.sectors);
   await check();
   const result=await dialog.showMessageBox(getWindow(),{type:'warning',title:'Konfirmasi VCD Burner',message:`Tulis VCD 2.0 ke ${recorder.name} [${drive}]?`,detail:`${project.sectors} sektor. Drive dipilih dari deteksi CDRDAO. Gunakan CD kosong; cakram akan difinalisasi.`,buttons:['Batal','Bakar VCD'],defaultId:0,cancelId:0,noLink:true});if(result.response!==1)return {cancelled:true};
   await check();emit('Menulis VCD dan memfinalisasi cakram…');
   await run(cdrdao(),['write','--device',drive,'--buffers','64','disc.cue'],{cwd:project.dir,captureAll:true});
   emit('CDRDAO melaporkan penulisan VCD selesai.');return {ok:true};
  }
  const status=await optical({action:'probe'});const recorder=status.drives.find(d=>d.id===drive&&d.writable);if(!recorder)throw Error('Recorder tidak tersedia.');
  await optical({action:'check',drive,kind:project.kind,sectors:project.sectors});
  const confirmation=await dialog.showMessageBox(getWindow(),{type:'warning',title:'Konfirmasi pembakaran cakram',message:`Tulis ${project.kind} ke ${recorder.name} (${recorder.volumes.join(', ')})?`,detail:`${project.sectors} sektor. Cakram harus kosong dan akan difinalisasi. Jangan keluarkan cakram atau tutup aplikasi selama penulisan.`,buttons:['Batal','Bakar cakram'],defaultId:0,cancelId:0,noLink:true});if(confirmation.response!==1)return {cancelled:true};
  emit('Menulis dan memfinalisasi cakram. Tunggu sampai drive selesai…');await optical({action:project.kind==='audio-cd'?'burn-audio':'burn-data',drive,kind:project.kind,sectors:project.sectors,image:project.image,tracks:project.tracks?.map(t=>t.pcm)});
  emit('Drive melaporkan penulisan dan finalisasi selesai.');return {ok:true};
 }));
 app.on('browser-window-created',(_event,win)=>{win.on('close',event=>{if(busy){event.preventDefault();emit('Tunggu operasi burner selesai sebelum menutup aplikasi.');}});});
 app.on('before-quit',event=>{if(busy){event.preventDefault();dialog.showMessageBox(getWindow(),{type:'info',message:'Operasi burner masih berlangsung. Tunggu sampai selesai sebelum menutup aplikasi.'});}else{try{fs.rmSync(workRoot,{recursive:true,force:true});}catch{}}});
 return {optical};
}
module.exports={registerBurner};
