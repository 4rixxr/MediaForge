const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-build-test-'));
  fs.cpSync(path.join(root, 'scripts'), path.join(dir, 'scripts'), {recursive:true});
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  return dir;
}
function run(dir, script) {
  return spawnSync(process.execPath,[path.join(dir,'scripts',script)],{cwd:dir,encoding:'utf8'});
}
test('clean removes generated output but preserves backend source', t=>{
  const dir=fixture(t);
  fs.writeFileSync(path.join(dir,'server.js'),'source');
  for(const name of ['dist','release','.mediaforge-app']) fs.mkdirSync(path.join(dir,name));
  assert.equal(run(dir,'clean.cjs').status,0);
  assert.equal(fs.readFileSync(path.join(dir,'server.js'),'utf8'),'source');
  for(const name of ['dist','release','.mediaforge-app']) assert.ok(!fs.existsSync(path.join(dir,name)));
});
test('staging fails before deleting previous app when dist is missing', t=>{
  const dir=fixture(t);
  fs.mkdirSync(path.join(dir,'.mediaforge-app'));
  fs.writeFileSync(path.join(dir,'.mediaforge-app','previous'),'keep');
  const result=run(dir,'stage-windows-app.cjs');
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/dist\/index.html/);
  assert.ok(fs.existsSync(path.join(dir,'.mediaforge-app','previous')));
});
test('staging includes current output and only production dependency lock records', t=>{
  const dir=fixture(t);
  for(const name of ['dist/index.html','desktop/main.cjs','desktop/preload.cjs','server.js']) {
    fs.mkdirSync(path.dirname(path.join(dir,name)),{recursive:true});
    fs.writeFileSync(path.join(dir,name),'current '+name);
  }
  for(const name of ['package.json','package-lock.json']) fs.copyFileSync(path.join(root,name),path.join(dir,name));
  assert.equal(run(dir,'stage-windows-app.cjs').status,0);
  const app=path.join(dir,'.mediaforge-app');
  const pkg=JSON.parse(fs.readFileSync(path.join(app,'package.json')));
  const lock=JSON.parse(fs.readFileSync(path.join(app,'package-lock.json')));
  assert.deepEqual(Object.keys(pkg.dependencies),['electron-updater']);
  assert.ok(lock.packages['node_modules/electron-updater']);
  assert.ok(!lock.packages['node_modules/electron']);
  assert.ok(!lock.packages['node_modules/vite']);
  assert.equal(fs.readFileSync(path.join(app,'dist/index.html'),'utf8'),'current dist/index.html');
});

test('packaged verification uses Windows separators and still rejects missing updater', () => {
  const vm = require('node:vm');
  const {createRequire} = require('node:module');
  const asarFs = require.resolve('@electron/asar/lib/filesystem.js');
  const localRequire = createRequire(asarFs);
  const exports = {};
  // Execute the installed ASAR traversal implementation with actual win32 path semantics.
  vm.runInNewContext(fs.readFileSync(asarFs,'utf8'), {
    exports, require: name => name === 'path' ? path.win32 : localRequire(name), Buffer, process,
  }, {filename:asarFs});
  const archiveFs = new exports.Filesystem('C:\\app');
  const names = ['dist/index.html','server.js','desktop/main.cjs','desktop/preload.cjs','node_modules/electron-updater/package.json'];
  const header = {files:{}};
  for(const name of names){let node=header;const parts=name.split('/');for(const part of parts.slice(0,-1))node=node.files[part] ||= {files:{}};node.files[parts.at(-1)]={size:1,offset:'0'};}
  archiveFs.setHeader(header,0);
  assert.throws(()=>archiveFs.getFile(names.at(-1)),/not found/); // Original bug.
  const source=fs.readFileSync(path.join(root,'scripts/verify-packaged.cjs'),'utf8');
  const runVerifier=()=>vm.runInNewContext(source,{
    __dirname:'C:\\project\\scripts', console:{log(){}},
    require: name=>name==='node:path'?path.win32:{extractFile:(_archive,name)=>Buffer.alloc(archiveFs.getFile(name).size)},
  });
  runVerifier();
  delete header.files.node_modules.files['electron-updater'].files['package.json'];
  assert.throws(runVerifier,/not found/);
});
