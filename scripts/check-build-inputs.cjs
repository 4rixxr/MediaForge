const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function check(root){
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
 if(lock.lockfileVersion!==3||pkg.version!==lock.version||pkg.version!==lock.packages?.['']?.version)throw Error('package.json and package-lock.json versions do not match.');
 for(const section of ['dependencies','devDependencies']){
  const a=pkg[section]||{},b=lock.packages[''][section]||{};
  if(Object.keys(a).length!==Object.keys(b).length||Object.keys(a).some(k=>a[k]!==b[k]))throw Error(section+' differs between package.json and lockfile. Run npm install and commit both files.');
 }
 for(const name of ['desktop/main.cjs','desktop/preload.cjs','desktop/media.cjs','desktop/burner.cjs','desktop/burner-core.cjs','desktop/optical.ps1','server.js','shared/media-profiles.js','shared/conversion.js','scripts/fetch-windows-tools.ps1','scripts/fetch-cdrdao.ps1','scripts/stage-vcdimager.sh','scripts/test-optical-windows.ps1','scripts/smoke-windows.ps1'])if(!fs.existsSync(path.join(root,name)))throw Error('Missing build input: '+name+'. Copy all source folders, not only package.json.');
 if(pkg.build?.directories?.app!=='.mediaforge-app')throw Error('Unexpected runtime staging directory.');
 if(!lock.packages['node_modules/electron']||!lock.packages['node_modules/electron-builder'])throw Error('Electron build dependencies are missing from the lockfile.');
 for(const folder of ['desktop','scripts','shared'])for(const file of fs.readdirSync(path.join(root,folder))){
  if(!/\.(cjs|js)$/.test(file))continue;
  const result=spawnSync(process.execPath,['--check',path.join(root,folder,file)],{encoding:'utf8'});
  if(result.status!==0)throw Error('JavaScript syntax error: '+file+'\n'+(result.stderr||result.error));
 }
 console.log('PASS build inputs:',pkg.version,'Electron',lock.packages['node_modules/electron'].version);
}
if(require.main===module)check(root);
module.exports={check};
