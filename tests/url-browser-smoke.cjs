const {chromium}=require('playwright'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {run}=require('../desktop/burner-core.cjs');
(async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mf-url-ui-'));let browser,server;
 try{
  const source=path.join(dir,'source.mkv'),ffmpeg=process.env.MEDIAFORGE_FFMPEG||'ffmpeg',ffprobe=process.env.MEDIAFORGE_FFPROBE||'ffprobe';
  await run(ffmpeg,['-v','error','-f','lavfi','-i','color=c=blue:s=640x480:r=25:d=2','-f','lavfi','-i','sine=duration=2','-c:v','mpeg4','-c:a','aac',source]);
  const runner=async(bin,args)=>{
   if(bin==='ffmpeg')return run(ffmpeg,args);
   if(args.includes('--dump-single-json'))return JSON.stringify({title:'URL integration fixture',duration:2,width:640,height:480,formats:[{url:'fixture',format_id:'1',ext:'mkv',height:480,width:640,vcodec:'mpeg4',acodec:'aac'}]});
   await new Promise(r=>setTimeout(r,300));
   const file=args[args.indexOf('-o')+1].replace('%(ext)s','mkv');await fs.copyFile(source,file);return JSON.stringify(file);
  };
  const {startServer}=await import('../server.js');server=await startServer({port:0,run:runner});
  browser=await chromium.launch({headless:true,...(process.env.MEDIAFORGE_CHROMIUM?{executablePath:process.env.MEDIAFORGE_CHROMIUM}:{})});
  const page=await browser.newPage({viewport:{width:1280,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole('button',{name:'Unduh dari URL',exact:true}).click();
  await page.getByLabel('Media URL').fill('https://youtu.be/fixture');await page.getByRole('button',{name:'Analyze URL'}).click();
  await page.getByRole('heading',{name:'URL integration fixture'}).waitFor();
  await page.getByLabel('URL resolution',{exact:true}).selectOption('360');await page.getByLabel('Start (sec)',{exact:true}).fill('0.4');await page.getByLabel('End (sec)',{exact:true}).fill('1.4');
  await page.getByRole('button',{name:'Review & download'}).click();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download now',exact:true}).click();
  assert.equal(await page.getByLabel('URL output format',{exact:true}).isDisabled(),true);
  const download=await downloadPromise;assert.match(download.suggestedFilename(),/\.mp4$/);
  const result=JSON.parse(await run(ffprobe,['-v','error','-show_streams','-show_format','-of','json',await download.path()]));
  assert.equal(result.streams[0].codec_name,'h264');assert.equal(result.streams[0].height,360);assert.ok(Math.abs(Number(result.format.duration)-1)<.1);
  await page.getByText(/Berkas siap:/).waitFor();
  // A static host returning index.html must never be reported as a successful video.
  await page.route('**/api/url/download',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html>not an API</html>'}));
  await page.getByRole('button',{name:'Review & download'}).click();await page.getByRole('button',{name:'Download now',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Backend tidak mengirim berkas unduhan'}).waitFor();
  assert.equal(await page.getByText(/Berkas siap:/).count(),0);assert.deepEqual(errors,[]);
  console.log('PASS URL UI: analyze -> settings -> confirmation -> actual MP4/H.264 download; trim/resolution; locked controls; HTML fallback rejection; no page errors.');
 }finally{await browser?.close();if(server)await new Promise(r=>{server.close(r);server.closeAllConnections();});await fs.rm(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
