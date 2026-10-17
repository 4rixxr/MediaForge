const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..'),source=path.join(root,'node_modules/@ffmpeg/core/dist/esm'),target=path.join(root,'public/ffmpeg');
fs.mkdirSync(target,{recursive:true});
for(const name of ['ffmpeg-core.js','ffmpeg-core.wasm']){const file=path.join(source,name);if(!fs.existsSync(file))throw Error('FFmpeg core missing. Run npm ci.');fs.copyFileSync(file,path.join(target,name));}
console.log('FFmpeg core copied into the app: conversion does not require a CDN.');
