const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const output=process.env.MEDIAFORGE_REVIEW_OUTPUT || path.join(root,'review');
const port=8790;
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const server=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,MEDIAFORGE_PORT:String(port)},stdio:'ignore'});
  let browser;
  try{
    for(let n=0;n<40;n++){try{await fetch(`http://127.0.0.1:${port}`);break}catch{await new Promise(resolve=>setTimeout(resolve,100));}}
    browser=await chromium.launch({headless:true,...(process.env.MEDIAFORGE_CHROMIUM?{executablePath:process.env.MEDIAFORGE_CHROMIUM}:{})});
    const page=await browser.newPage({viewport:{width:1280,height:960},reducedMotion:'reduce'});
    const errors=[],checks=[];
    page.on('pageerror',e=>errors.push(e.message));
    // Optional local copies of the SAME production WASM core; encoding remains real.
    if(process.env.MEDIAFORGE_TEST_CORE)await page.route('https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/*',async route=>{
      const file=path.basename(new URL(route.request().url()).pathname);
      await route.fulfill({status:200,contentType:file.endsWith('.wasm')?'application/wasm':'text/javascript',headers:{'access-control-allow-origin':'*'},body:fs.readFileSync(path.join(process.env.MEDIAFORGE_TEST_CORE,file))});
    });
    await page.goto(`http://127.0.0.1:${port}`);
    await page.getByRole('heading',{name:'Siapkan berkas'}).waitFor();
    assert.equal(await page.locator('.cv-stat').count(),4);
    assert.equal(await page.locator('.cv-modes button').count(),4);
    await page.screenshot({path:path.join(output,'MediaForge_UI_Reference_Desktop.png'),fullPage:true});
    checks.push('Reference layout: four stats, four modes, split workspace, queue, history.');
    await page.getByRole('button',{name:'Contoh berkas',exact:true}).click();
    await page.getByLabel('Format keluaran',{exact:true}).selectOption('wav');
    await page.getByLabel('Kanal',{exact:true}).selectOption('1');
    await page.getByRole('button',{name:'Konversi sekarang',exact:true}).click();
    await page.locator('.cv-job .completed').waitFor();
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Unduh Contoh-audio.wav',exact:true}).click()]);
    const wav=fs.readFileSync(await download.path());
    assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt16LE(22),1);
    assert.equal(await page.locator('.cv-history-panel tbody tr').count(),1);
    checks.push('Actual WAV conversion/download: RIFF header and selected mono channel verified.');
    await page.getByRole('group',{name:'Filter antrean'}).getByRole('button',{name:/Diproses/}).click();
    await page.getByText('Tidak ada tugas pada filter ini').waitFor();
    await page.getByRole('group',{name:'Filter antrean'}).getByRole('button',{name:/Semua/}).click();
    await page.getByRole('button',{name:'Bersihkan selesai',exact:true}).click();
    assert.equal(await page.locator('.cv-job').count(),0);
    assert.equal(await page.locator('.cv-history-panel tbody tr').count(),1);
    checks.push('Queue filter and cleanup work; completed history is retained.');
    if(process.env.MEDIAFORGE_TEST_CORE){
      for(const [mode,format] of [['Audio → Audio','mp3'],['Audio → Video','mp4'],['Video → Video','webm'],['Video → Audio','wav']]){
        await page.getByRole('group',{name:'Mode konversi'}).getByRole('button',{name:new RegExp(mode)}).click();
        await page.getByRole('button',{name:'Contoh berkas',exact:true}).click();
        await page.getByText('1 berkas siap dikonversi',{exact:true}).waitFor();
        await page.getByLabel('Format keluaran',{exact:true}).selectOption(format);
        await page.getByRole('button',{name:'Konversi sekarang',exact:true}).click();
        const job=page.locator('.cv-job').last();
        await job.locator('.completed').waitFor({timeout:120000});
        const [result]=await Promise.all([page.waitForEvent('download'),job.getByRole('button',{name:/^Unduh/}).click()]);
        const bytes=fs.readFileSync(await result.path());assert.ok(bytes.length>100);
        if(format==='mp4')assert.equal(bytes.toString('ascii',4,8),'ftyp');
        if(format==='webm')assert.equal(bytes.subarray(0,4).toString('hex'),'1a45dfa3');
        if(format==='mp3')assert.ok(bytes.toString('ascii',0,3)==='ID3'||bytes[0]===255);
        if(format==='wav')assert.equal(bytes.toString('ascii',0,4),'RIFF');
        checks.push('Real '+mode+' conversion and '+format.toUpperCase()+' output signature verified.');
      }
    }
    await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0)});
    await page.screenshot({path:path.join(output,'MediaForge_UI_Reference_Results.png'),fullPage:true});
    await page.getByRole('button',{name:'Dark theme',exact:true}).click();
    await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0)});
    await page.screenshot({path:path.join(output,'MediaForge_UI_Reference_Dark.png'),fullPage:true});
    await page.getByRole('button',{name:'Light theme',exact:true}).click();
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0)});
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:path.join(output,'MediaForge_UI_Reference_Mobile.png'),fullPage:true});
    await page.getByRole('button',{name:'Open navigation',exact:true}).click();
    await page.getByRole('button',{name:'Pengaturan',exact:true}).click();
    await page.getByRole('heading',{name:'Pengaturan',exact:true}).waitFor();
    checks.push('Dark theme and mobile layout/navigation checked without horizontal overflow.');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({browser:await browser.version(),checks,errors},null,2));
    console.log(JSON.stringify({checks,errors},null,2));
  }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
