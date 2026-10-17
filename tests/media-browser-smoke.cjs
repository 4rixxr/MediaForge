// Exercise the production UI and the actual FFmpeg.wasm build, then independently
// probe downloaded media. Playwright and Chromium are review-only dependencies.
const {chromium}=require('playwright');
const {spawn,execFileSync}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),port=8796;
const output=process.env.MEDIAFORGE_REVIEW_OUTPUT||path.join(root,'review');
(async()=>{fs.mkdirSync(output,{recursive:true});
 const server=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,MEDIAFORGE_PORT:String(port)},stdio:'ignore'});let browser;
 try{
  for(let i=0;i<50;i++){try{await fetch(`http://127.0.0.1:${port}`);break;}catch{await new Promise(r=>setTimeout(r,100));}}
  browser=await chromium.launch({headless:true,args:process.env.MEDIAFORGE_BROWSER_FLAGS?.split(' ')||[],...(process.env.MEDIAFORGE_CHROMIUM?{executablePath:process.env.MEDIAFORGE_CHROMIUM}:{})});
  const page=await browser.newPage({viewport:{width:1280,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(process.env.MEDIAFORGE_TEST_NATIVE){
   const {convertMedia}=require('../desktop/media.cjs');
   await page.exposeFunction('__nativeMedia',async request=>{const r=await convertMedia({...request,bytes:Uint8Array.from(request.bytes).buffer},{ffmpeg:process.env.MEDIAFORGE_FFMPEG||'ffmpeg',ffprobe:process.env.MEDIAFORGE_FFPROBE||'ffprobe'});return {...r,bytes:Array.from(r.bytes)};});
   await page.addInitScript(()=>{window.mediaforgeMedia={subscribe:()=>()=>{},convert:async(_id,r)=>{const result=await window.__nativeMedia({...r,bytes:Array.from(new Uint8Array(r.bytes))});return {...result,bytes:Uint8Array.from(result.bytes)};}};});
  }
  await page.goto(`http://127.0.0.1:${port}`);await page.getByRole('heading',{name:'Siapkan berkas'}).waitFor();
  for(const [mode,format,codec,quality] of [['Audio → Audio','ogg','vorbis','5'],['Audio → Audio','opus','opus','128'],['Audio → Audio','wma','wmav2','192'],['Audio → Audio','flac','flac',null],['Audio → Audio','m4a','aac','192'],['Video → Video','mpeg','mpeg1video',null],['Video → Video','mpeg2','mpeg2video',null],['Video → Video','dat','mpeg1video',null]].filter(row=>!process.env.MEDIAFORGE_TEST_FORMAT||row[1]===process.env.MEDIAFORGE_TEST_FORMAT)){
   await page.getByRole('group',{name:'Mode konversi'}).getByRole('button',{name:new RegExp(mode)}).click();
   await page.getByRole('button',{name:'Contoh berkas',exact:true}).click();await page.getByText('1 berkas siap dikonversi',{exact:true}).waitFor();
   await page.getByLabel('Format keluaran',{exact:true}).selectOption(format);if(quality)await page.getByLabel('Kualitas',{exact:true}).selectOption(quality);
   await page.getByRole('button',{name:'Konversi sekarang',exact:true}).click();const job=page.locator('.cv-job').last();
   await job.locator('.completed,.failed').waitFor({timeout:120000});assert.equal(await job.locator('.failed').count(),0,await job.innerText());
   const [download]=await Promise.all([page.waitForEvent('download'),job.getByRole('button',{name:/^Unduh/}).click()]);
   await download.saveAs(path.join(output,'sample.'+format));
   const info=JSON.parse(execFileSync(process.env.MEDIAFORGE_FFPROBE||'ffprobe',['-v','error','-show_streams','-count_frames','-of','json',await download.path()],{encoding:'utf8'}));
   assert.equal(info.streams[0].codec_name,codec);if(format==='dat'){assert.equal(info.streams[0].width,352);assert.equal(info.streams[0].height,288);assert.equal(info.streams[0].avg_frame_rate,'25/1');assert.ok(Math.abs(Number(info.streams[0].nb_read_frames)/Number(info.streams[0].duration)-25)<1);assert.equal(info.streams[1].sample_rate,'44100');assert.equal(info.streams[1].bit_rate,'224000');}
   console.log('PASS production '+(process.env.MEDIAFORGE_TEST_NATIVE?'native':'browser')+' conversion:',format,codec);
  }
  await page.getByRole('button',{name:'Unduh dari URL',exact:true}).click();
  for(const text of ['YouTube · Supported','Bstation / Bilibili · Supported','Dailymotion · Supported'])await page.getByText(text,{exact:true}).waitFor();
  assert.equal(await page.getByText(/Apple Music|DRM Restricted/).count(),0);
  await page.getByRole('button',{name:/^Burner/}).click();await page.getByRole('button',{name:'VCD / CD / DVD',exact:true}).click();
  await page.getByRole('heading',{name:'Burner Studio'}).waitFor();assert.equal(await page.getByRole('button',{name:'Tambah berkas',exact:true}).isDisabled(),true);
  await page.screenshot({path:path.join(output,'MediaForge_Burner_Preview.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);console.log('PASS URL supported labels; browser cannot expose physical burner operations; responsive Burner UI.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
