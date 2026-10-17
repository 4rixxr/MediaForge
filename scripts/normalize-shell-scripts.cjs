const fs=require('node:fs'),path=require('node:path');
function normalize(root){
 const files=fs.readdirSync(root).filter(name=>name.endsWith('.sh')).map(name=>path.join(root,name));
 const scripts=path.join(root,'scripts');
 files.push(...fs.readdirSync(scripts).filter(name=>name.endsWith('.sh')).map(name=>path.join(scripts,name)));
 let changed=0;
 for(const file of files){
  const source=fs.readFileSync(file,'utf8'),fixed=source.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  if(fixed!==source){fs.writeFileSync(file,fixed,'utf8');changed++;}
 }
 console.log(`Shell scripts ready: ${files.length} checked, ${changed} line-ending/BOM fixes.`);
 return changed;
}
if(require.main===module)normalize(path.resolve(__dirname,'..'));
module.exports={normalize};
