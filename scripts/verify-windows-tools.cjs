const fs=require('node:fs');const path=require('node:path');
const resources=process.argv[2]?path.resolve(process.argv[2]):path.resolve(__dirname,'../vendor/win');
for(const file of ['yt-dlp.exe','node.exe','ffmpeg.exe','ffprobe.exe','vcdimager.exe','vcd-info.exe','cdrdao/cdrdao.exe','cdrdao/msys-2.0.dll']){
 const full=path.join(resources,'bin',file);if(!fs.existsSync(full)||fs.statSync(full).size<1000)throw Error('Missing Windows runtime: '+file+'. Follow README_WINDOWS_INSTALLER.md before packaging.');
}
if(!fs.readdirSync(path.join(resources,'bin')).some(name=>name.toLowerCase().endsWith('.dll')))throw Error('VCDImager runtime DLLs are missing.');
const optical=process.argv[2]?path.join(resources,'optical','optical.ps1'):path.resolve(__dirname,'../desktop/optical.ps1');
if(!fs.existsSync(optical))throw Error('Optical Windows helper is missing.');
if(!fs.existsSync(path.join(resources,'licenses','cdrdao','cdrdao-1.2.6.tar.gz')))throw Error('CDRDAO source/license archive is missing.');
if(!fs.existsSync(path.join(resources,'licenses','NODE-LICENSE.txt'))||fs.statSync(path.join(resources,'licenses','NODE-LICENSE.txt')).size<100)throw Error('Bundled Node license is missing or empty. Run scripts/fetch-windows-tools.ps1.');
console.log('PASS: Windows media/optical executables, DLLs, helper, and source archive are present.');
