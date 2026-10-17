// The network extractor alone is a fixture; HTTP, final-path selection, FFmpeg,
// output bytes and FFprobe inspection are real. No claim of a live site download.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {run}=require('../desktop/burner-core.cjs');
test('URL output pipeline produces valid containers, exact trim, resolution cap and silent video',{skip:process.env.MEDIAFORGE_NATIVE_TEST!=='1',timeout:120000},async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mf-url-native-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const ffmpeg=process.env.MEDIAFORGE_FFMPEG||'ffmpeg',ffprobe=process.env.MEDIAFORGE_FFPROBE||'ffprobe',source=path.join(dir,'source.mkv');
 await run(ffmpeg,['-v','error','-f','lavfi','-i','testsrc2=s=640x480:r=25:d=2','-f','lavfi','-i','sine=frequency=440:duration=2','-c:v','libvpx-vp9','-deadline','realtime','-cpu-used','8','-c:a','libopus',source]);
 let silent=false;
 const runner=async(bin,args)=>{
  if(bin==='ffmpeg')return run(ffmpeg,args);
  if(args.includes('--dump-single-json'))return JSON.stringify({title:'Fixture',duration:2,width:640,height:480,formats:[]});
  const final=args[args.indexOf('-o')+1].replace('%(ext)s','mkv');
  if(silent)await run(ffmpeg,['-v','error','-i',source,'-c:v','copy','-an',final]);else await fs.copyFile(source,final);
  await fs.writeFile(path.join(path.dirname(final),'download.f137.mp4'),'fragment');
  return JSON.stringify(final)+'\n';
 };
 const {startServer}=await import('../server.js'),server=await startServer({port:0,run:runner});
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const origin=`http://127.0.0.1:${server.address().port}`;
 for(const [kind,format,codec] of [['video','mp4','h264'],['video','webm','vp9'],['video','mkv','h264'],['video','mpeg','mpeg1video'],['video','mpeg2','mpeg2video'],['video','dat','mpeg1video'],['audio','wma','wmav2'],['audio','opus','opus']]){
  const res=await fetch(origin+'/api/url/download',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({url:'https://www.youtube.com/watch?v=fixture',kind,format,ratio:'original',resolution:'360',start:.4,end:1.4})});
  assert.equal(res.status,200,await(res.status!==200?res.text():Promise.resolve('')));
  const out=path.join(dir,'result.'+format);await fs.writeFile(out,Buffer.from(await res.arrayBuffer()));
  const info=JSON.parse(await run(ffprobe,['-v','error','-show_streams','-show_format','-of','json',out]));
  assert.equal(info.streams[0].codec_name,codec);assert.ok(Math.abs(Number(info.format.duration)-1)<.15,format+' duration '+info.format.duration);
  if(kind==='video'){assert.ok(info.streams[0].height<=360);assert.ok(info.streams.some(s=>s.codec_type==='audio'));}
 }
 silent=true;
 const res=await fetch(origin+'/api/url/download',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:'https://youtu.be/fixture',kind:'video',format:'mp4',ratio:'original',resolution:'original',start:0,end:0})});
 assert.equal(res.status,200);const out=path.join(dir,'silent.mp4');await fs.writeFile(out,Buffer.from(await res.arrayBuffer()));
 const info=JSON.parse(await run(ffprobe,['-v','error','-show_streams','-of','json',out]));assert.equal(info.streams.length,1);assert.equal(info.streams[0].codec_name,'h264');
});
