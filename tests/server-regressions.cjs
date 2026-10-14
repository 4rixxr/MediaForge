const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

test('local HTTP downloader validates requests and uses bundled FFmpeg correctly', async t=>{
  const old=process.env.MEDIAFORGE_FFMPEG;
  process.env.MEDIAFORGE_FFMPEG=path.join(os.tmpdir(),'MediaForge tools','ffmpeg.exe');
  t.after(()=>{if(old===undefined)delete process.env.MEDIAFORGE_FFMPEG;else process.env.MEDIAFORGE_FFMPEG=old;});
  const {startServer}=await import('../server.js');
  const calls=[];
  const run=async(bin,args)=>{
    calls.push({bin,args});
    if(args.includes('--dump-single-json')) return JSON.stringify({title:'Test media',duration:120,formats:[]});
    if(bin==='ffmpeg') {await fs.writeFile(args.at(-1),'cropped');return '';}
    const output=args[args.indexOf('-o')+1];
    const ext=args.includes('--remux-video')?'mkv':args.includes('-x')?'m4a':'mp4';
    const final=output.replace('%(ext)s',ext);
    await fs.writeFile(final,'media data');
    // A leftover fragment must never be chosen as the final download.
    await fs.writeFile(output.replace('%(ext)s','f137.mp4'),'wrong fragment');
    return JSON.stringify(final)+'\n';
  };
  const server=await startServer({port:0,run});
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const base={url:'https://www.youtube.com/watch?v=test',kind:'video',format:'mp4',ratio:'original',resolution:'720',start:0,end:0};
  const post=(body,headers={})=>fetch(origin+'/api/url/download',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...headers},body:JSON.stringify(body)});
  await t.test('foreign origins are rejected before executing a tool',async()=>{
    const n=calls.length;
    assert.equal((await post(base,{Origin:'https://example.com'})).status,403);
    assert.equal(calls.length,n);
  });
  await t.test('DRM service and malformed range are rejected',async()=>{
    assert.equal((await post({...base,url:'https://music.apple.com/test'})).status,422);
    assert.equal((await post({...base,start:50,end:20})).status,400);
  });
  await t.test('resolution is capped locally and extraction uses explicit FFmpeg/JS paths',async()=>{
    const res=await post(base);assert.equal(res.status,200);assert.equal(await res.text(),'cropped');
    const args=calls.findLast(c=>c.bin==='yt-dlp').args;
    assert.match(args[args.indexOf('-f')+1],/^bestvideo\[height<=720\]/);
    assert.equal(args[args.indexOf('--ffmpeg-location')+1],path.dirname(process.env.MEDIAFORGE_FFMPEG));
    assert.ok(args.includes('--ignore-config'));
    assert.equal(args[args.indexOf('--js-runtimes')+1],`node:${process.execPath}`);
    const codec=calls.at(-1).args;assert.match(codec[codec.indexOf('-vf')+1],/min\(ih,720\)/);
    assert.equal(codec[codec.indexOf('-c:v')+1],'libx264');
    assert.ok(!codec[codec.indexOf('-i')+1].endsWith('f137.mp4'));
  });
  await t.test('original audio extracts audio even from a combined stream',async()=>{
    const res=await post({...base,kind:'audio',format:'original'});assert.equal(res.status,200);await res.arrayBuffer();
    const args=calls.at(-1).args;assert.ok(args.includes('-x'));assert.equal(args[args.indexOf('--audio-format')+1],'best');
    assert.match(res.headers.get('content-disposition'),/\.m4a/);
  });
  await t.test('MKV is remuxed even when no stream merge was needed',async()=>{
    const res=await post({...base,format:'mkv'});assert.equal(res.status,200);await res.arrayBuffer();
    const args=calls.findLast(c=>c.bin==='yt-dlp').args;assert.equal(args[args.indexOf('--remux-video')+1],'mkv');
    assert.match(res.headers.get('content-disposition'),/\.mkv/);
  });
  await t.test('portrait crop rounds dimensions to even encoder-compatible values',async()=>{
    const res=await post({...base,ratio:'9:16'});assert.equal(res.status,200);assert.equal(await res.text(),'cropped');
    const args=calls.at(-1).args;assert.match(args[args.indexOf('-vf')+1],/trunc\(min\(iw,ih\*9\/16\)\/2\)\*2/);
  });
  await t.test('URL audio uses the chosen Vorbis quality and WMA/Opus bitrate',async()=>{
    for(const [format,values,codec,flag,value] of [['ogg',{quality:7},'libvorbis','-q:a','7'],['opus',{bitrate:96},'libopus','-b:a','96k'],['wma',{bitrate:160},'wmav2','-b:a','160k']]){
      const res=await post({...base,kind:'audio',format,...values});assert.equal(res.status,200);await res.arrayBuffer();
      const args=calls.at(-1).args;assert.equal(args[args.indexOf('-c:a')+1],codec);assert.equal(args[args.indexOf(flag)+1],value);
    }
    const n=calls.length;assert.equal((await post({...base,kind:'audio',format:'wma',bitrate:510})).status,400);assert.equal(calls.length,n);
  });
  await t.test('DAT keeps the crop and fixed VCD video filter in one chain',async()=>{
    const res=await post({...base,format:'dat',ratio:'9:16'});assert.equal(res.status,200);await res.arrayBuffer();
    const args=calls.at(-1).args;assert.equal(args.filter(a=>a==='-vf').length,1);
    assert.match(args[args.indexOf('-vf')+1],/^crop=.*scale=.*pad=352:288/);
    assert.equal(args[args.indexOf('-target')+1],'pal-vcd');
  });
  await t.test('occupied port rejects startup instead of emitting unhandled error',async()=>{
    await assert.rejects(startServer({port:server.address().port}),{code:'EADDRINUSE'});
  });
  await t.test('localhost alias and local accurate trim work without remote sections',async()=>{
    const res=await post({...base,start:2,end:5},{Origin:origin.replace('127.0.0.1','localhost')});assert.equal(res.status,200);await res.arrayBuffer();
    const args=calls.at(-1).args;assert.equal(args[args.indexOf('-ss')+1],'2');assert.equal(args[args.indexOf('-t')+1],'3');
    assert.ok(!calls.findLast(c=>c.bin==='yt-dlp').args.includes('--download-sections'));
  });
});
