import {audioArgs,audioProfiles,videoArgs,videoProfiles} from './media-profiles.js';
function number(value,name,min,max){if(value!==undefined&&(!Number.isFinite(value)||value<min||value>max))throw Error(`${name} di luar rentang yang didukung.`);}
export function conversionArgs(kind,format,options={},input='input',output='output'){
 if(!['audio','video','audio-video'].includes(kind))throw Error('Jenis konversi tidak dikenal.');
 number(options.startTime,'Waktu mulai',0,864000);number(options.endTime,'Waktu selesai',0,864000);
 if(options.endTime!==undefined&&options.endTime<=(options.startTime||0))throw Error('Waktu selesai harus setelah waktu mulai.');
 const args=['-y'];
 if(kind==='audio-video'){
  if(!['mp4','webm'].includes(format))throw Error('Audio ke video mendukung MP4/WebM.');
  number(options.fps,'Frame rate',1,120);number(options.videoBitrate,'Bitrate video',10000,100000000);
  args.push('-f','lavfi','-i',`color=c=0x211a38:s=1280x720:r=${options.fps||30}`,'-i',input,'-map','0:v:0','-map','1:a:0',...videoArgs(format,{bitrate:options.videoBitrate||2500000}),'-b:a','192k','-shortest');
 }else{
  args.push('-i',input);
  if(options.startTime)args.push('-ss',String(options.startTime));
  if(options.endTime)args.push('-t',String(options.endTime-(options.startTime||0)));
  if(kind==='audio'){
   if(!audioProfiles[format])throw Error('Format audio tidak didukung.');
   number(options.volume,'Volume',0,4);
   args.push('-map','0:a:0','-vn');
   if(options.volume!==undefined&&options.volume!==1)args.push('-af',`volume=${options.volume}`);
   args.push(...audioArgs(format,options));
  }else{
   if(!videoProfiles[format])throw Error('Format video tidak didukung.');
   number(options.fps,'Frame rate',1,120);number(options.bitrate,'Bitrate video',10000,100000000);
   const filters=[];
   if(options.crop){for(const key of ['x','y','width','height'])number(options.crop[key],'Crop '+key,key==='x'||key==='y'?0:2,32768);if(['x','y','width','height'].some(k=>!Number.isInteger(options.crop[k])))throw Error('Crop harus berupa piksel utuh.');const {x,y,width,height}=options.crop;filters.push(`crop=${width}:${height}:${x}:${y}`);}
   if(options.resolution&&format!=='dat'){const {width,height}=options.resolution;number(width,'Lebar',2,8192);number(height,'Tinggi',2,8192);if(!Number.isInteger(width)||!Number.isInteger(height))throw Error('Resolusi tidak valid.');filters.push(`scale=${width}:${height}`);}
   if(options.fps&&!['dat','mpeg','mpeg2'].includes(format))filters.push(`fps=${options.fps}`);
   const codec=videoArgs(format,options),filterIndex=codec.indexOf('-vf');if(filterIndex>=0)filters.push(codec.splice(filterIndex,2)[1]);
   args.push('-map','0:v:0');if(format!=='gif'&&!options.removeAudio)args.push('-map','0:a:0?');else args.push('-an');
   if(['mp4','mkv','mov','ts','avi','mpeg','mpeg2'].includes(format))filters.push('pad=ceil(iw/2)*2:ceil(ih/2)*2');
   if(filters.length)args.push('-vf',filters.join(','));
   args.push(...codec);
  }
 }
 return [...args,output];
}
