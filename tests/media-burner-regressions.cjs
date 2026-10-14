const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');
const {run,buildImage,validateRequest,checkVcdMedia,parseScan}=require('../desktop/burner-core.cjs');
const ffmpeg=process.env.MEDIAFORGE_FFMPEG||'ffmpeg',ffprobe=process.env.MEDIAFORGE_FFPROBE||'ffprobe';
const native=process.env.MEDIAFORGE_NATIVE_TEST==='1';
test('burner validation rejects unknown media, duplicate source and unverified/occupied discs',()=>{
 assert.throws(()=>validateRequest({kind:'dvd-video',standard:'pal',minutes:'80',files:['1']}));
 assert.throws(()=>validateRequest({kind:'vcd',standard:'pal',minutes:'80',files:['1','1']}));
 const valid='CD-R empty           : yes\nTotal Capacity       : 79:59:74 (359999 blocks, 703/807 MB)\n';
 assert.equal(checkVcdMedia(valid,300000),359999);
 assert.throws(()=>checkVcdMedia(valid,400000));assert.throws(()=>checkVcdMedia(valid.replace('yes','no'),20));assert.throws(()=>checkVcdMedia(valid.replace('359999','2300000'),20));
 assert.deepEqual(parseScan('noise\n  1,0,0 : TEST, Recorder, 1.0\n'),[{id:'1,0,0',name:'TEST, Recorder, 1.0'}]);
});
test('audio/video profiles use actual codec constraints',async()=>{const {audioArgs,videoArgs}=await import('../shared/media-profiles.js');
 assert.ok(audioArgs('ogg',{quality:5}).includes('libvorbis'));assert.ok(!audioArgs('ogg',{quality:5}).includes('-b:a'));
 assert.ok(audioArgs('opus',{bitrate:510,channels:2}).includes('510k'));assert.throws(()=>audioArgs('opus',{bitrate:510,channels:1}));assert.throws(()=>audioArgs('opus',{sampleRate:44100}));
 for(const f of ['aac','m4a']){assert.throws(()=>audioArgs(f,{channels:1,bitrate:320}));assert.ok(audioArgs(f,{channels:2,bitrate:512}).includes('512k'));}
 assert.ok(audioArgs('wma',{bitrate:192}).includes('wmav2'));for(const f of ['wav','flac'])assert.ok(!audioArgs(f,{bitrate:320}).includes('-b:a'));
 assert.ok(videoArgs('mpeg').includes('mpeg1video'));assert.ok(videoArgs('mpeg2').includes('mpeg2video'));assert.ok(videoArgs('dat').includes('pal-vcd'));
});
test('real encoders and sector-aligned CD/VCD images',{skip:!native,timeout:240000},async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mf-native-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const {audioArgs,videoArgs,audioProfiles}=await import('../shared/media-profiles.js');
 const source=path.join(dir,'source.wav');await run(ffmpeg,['-v','error','-y','-f','lavfi','-i','sine=frequency=440:duration=5','-ar','44100','-ac','2',source]);
 for(const [format,p] of Object.entries(audioProfiles)){
  const out=path.join(dir,'test.'+format);await run(ffmpeg,['-v','error','-y','-i',source,...audioArgs(format,{}),out]);
  const info=JSON.parse(await run(ffprobe,['-v','error','-show_streams','-of','json',out]));
  const expected={mp3:'mp3',ogg:'vorbis',opus:'opus',aac:'aac',m4a:'aac',wma:'wmav2',wav:'pcm_s16le',flac:'flac'};
  assert.equal(info.streams[0].codec_name,expected[format]);assert.equal(info.streams[0].channels,2);
 }
 const clip=path.join(dir,'source.mp4');await run(ffmpeg,['-v','error','-y','-f','lavfi','-i','color=c=blue:s=320x240:r=25:d=5','-i',source,'-shortest','-c:v','mpeg4','-c:a','aac',clip]);
 for(const format of ['mpeg','mpeg2','dat']){const out=path.join(dir,'test.'+format);await run(ffmpeg,['-v','error','-y','-i',clip,...videoArgs(format,{bitrate:1500000}),out]);const info=JSON.parse(await run(ffprobe,['-v','error','-show_streams','-of','json',out]));assert.equal(info.streams[0].codec_name,format==='mpeg2'?'mpeg2video':'mpeg1video');if(format==='dat'){assert.equal(info.streams[0].width,352);assert.equal(info.streams[0].height,288);assert.equal(info.streams.find(s=>s.codec_type==='audio').codec_name,'mp2');}}
 const request={kind:'audio-cd',files:['source'],standard:'pal',minutes:'74'};
 const audio=await buildImage(request,[source],path.join(dir,'audio'),{ffmpeg,ffprobe});
 const wav=await fs.readFile(path.join(audio.dir,'track-01.wav'));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),44100);assert.equal(wav.readUInt16LE(22),2);assert.equal(wav.readUInt16LE(34),16);assert.equal((wav.length-44)%2352,0);assert.match(await fs.readFile(audio.image,'utf8'),/TRACK 01 AUDIO/);
 if(process.env.MEDIAFORGE_VCDIMAGER)for(const standard of ['pal','ntsc']){
  const vcd=await buildImage({...request,kind:'vcd',standard},[clip],path.join(dir,standard),{ffmpeg,ffprobe,vcdimager:process.env.MEDIAFORGE_VCDIMAGER});
  const bin=await fs.readFile(path.join(vcd.dir,'disc.bin'));assert.equal(bin.length%2352,0);assert.equal(bin.toString('ascii',16*2352+25,16*2352+30),'CD001');assert.ok(bin.includes(Buffer.from('VIDEO_CD')));assert.match(await fs.readFile(vcd.image,'utf8'),/TRACK 02 MODE2\/2352/);
 }
});
test('shared conversion validation rejects incomplete crop and invalid trim',async()=>{
 const {conversionArgs}=await import('../shared/conversion.js');
 assert.throws(()=>conversionArgs('video','mp4',{crop:{width:100,height:100}}),/Crop/);
 assert.throws(()=>conversionArgs('video','mp4',{startTime:1,endTime:0}),/Waktu selesai/);
 assert.throws(()=>conversionArgs('audio','mp3',{volume:NaN}));
});
test('desktop bridge converts, probes and rejects invalid inputs using native FFmpeg',{skip:!native},async t=>{
 const {convertMedia,inspectMedia}=require('../desktop/media.cjs'),dir=await fs.mkdtemp(path.join(os.tmpdir(),'mf-bridge-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const source=path.join(dir,'source.wav');await run(ffmpeg,['-v','error','-y','-f','lavfi','-i','sine=frequency=1000:duration=1.5',source]);
 const data=await fs.readFile(source);const result=await convertMedia({bytes:data,kind:'audio',format:'opus',options:{bitrate:128,sampleRate:48000,channels:2,startTime:.25,endTime:1.25}},{ffmpeg,ffprobe});
 const info=await inspectMedia(result.bytes,{ffprobe});assert.equal(info.streams[0].codec_name,'opus');assert.equal(info.streams[0].sample_rate,'48000');assert.equal(info.streams[0].channels,2);assert.ok(Math.abs(Number(info.format.duration)-1)<.05);
 await assert.rejects(convertMedia({bytes:data,kind:'video',format:'mp4',options:{}},{ffmpeg,ffprobe}),/tidak memiliki video/);
 await assert.rejects(convertMedia({bytes:new Uint8Array(0),kind:'audio',format:'mp3'},{ffmpeg,ffprobe}),/kosong/);
 await assert.rejects(convertMedia({bytes:data,kind:'audio',format:'mp3',options:{startTime:99}},{ffmpeg,ffprobe}),/durasi/);
});
