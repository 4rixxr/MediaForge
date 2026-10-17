const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mf-checkout-'));fs.mkdirSync(path.join(dir,'scripts'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
test('Git Windows autocrlf checkout retains LF for VCD staging script',t=>{
 const dir=fixture(t),name='scripts/stage-vcdimager.sh';
 fs.copyFileSync(path.join(root,'.gitattributes'),path.join(dir,'.gitattributes'));
 fs.copyFileSync(path.join(root,name),path.join(dir,name));
 const git=(...args)=>{const r=spawnSync('git',['-c','core.autocrlf=true','-c','core.eol=crlf',...args],{cwd:dir,encoding:'utf8'});assert.equal(r.status,0,r.stderr||String(r.error));};
 git('init','-q');git('add','.gitattributes',name);fs.unlinkSync(path.join(dir,name));git('checkout-index','-f','-a');
 const bytes=fs.readFileSync(path.join(dir,name));assert.ok(!bytes.includes(13));assert.equal(bytes.toString(),fs.readFileSync(path.join(root,name),'utf8'));
});
test('shell normalization repairs CRLF and BOM without rewriting commands',t=>{
 const dir=fixture(t),file=path.join(dir,'scripts','stage-vcdimager.sh');
 const original=fs.readFileSync(path.join(root,'scripts/stage-vcdimager.sh'),'utf8');
 fs.writeFileSync(file,'\uFEFF'+original.replace(/\n/g,'\r\n'));
 const {normalize}=require('../scripts/normalize-shell-scripts.cjs');
 assert.equal(normalize(dir),1);assert.equal(fs.readFileSync(file,'utf8'),original);assert.equal(normalize(dir),0);
 // Exact byte equality verifies the shell input without relying on a particular
 // Bash installation (Git Bash, MSYS2 or WSL) being present in Windows PATH.
});
