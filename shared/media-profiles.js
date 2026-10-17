// Encoder settings shared by the UI and tests. Rates are presets, not codec-wide limits.
/** @type {Record<string,{codec:string,mux:string,mime:string,rates:number[],default:number,samples:number[],quality?:boolean,lossless?:boolean}>} */
export const audioProfiles = {
  mp3: {codec:'libmp3lame', mux:'mp3', mime:'audio/mpeg', rates:[32,40,48,56,64,80,96,112,128,160,192,224,256,320], default:192, samples:[44100,48000]},
  ogg: {codec:'libvorbis', mux:'ogg', mime:'audio/ogg', rates:[-1,0,1,2,3,4,5,6,7,8,9,10], default:5, samples:[44100,48000], quality:true},
  opus: {codec:'libopus', mux:'opus', mime:'audio/ogg;codecs=opus', rates:[6,12,16,24,32,48,64,80,96,128,160,192,256,320,384,448,510], default:128, samples:[8000,12000,16000,24000,48000]},
  aac: {codec:'aac', mux:'adts', mime:'audio/aac', rates:[32,48,64,96,128,160,192,256,320,384,512], default:192, samples:[44100,48000]},
  m4a: {codec:'aac', mux:'ipod', mime:'audio/mp4', rates:[32,48,64,96,128,160,192,256,320,384,512], default:192, samples:[44100,48000]},
  wma: {codec:'wmav2', mux:'asf', mime:'audio/x-ms-wma', rates:[48,64,96,128,160,192,256,320], default:128, samples:[44100,48000]},
  wav: {codec:'pcm_s16le', mux:'wav', mime:'audio/wav', rates:[], default:0, samples:[22050,24000,32000,44100,48000,96000], lossless:true},
  flac: {codec:'flac', mux:'flac', mime:'audio/flac', rates:[], default:0, samples:[22050,32000,44100,48000,96000], lossless:true},
};
export function audioRates(format, channels=2, sampleRate=44100) {
  const p=audioProfiles[format];if(!p)return [];
  return p.rates.filter(rate=>(format!=='opus'||rate<=256*channels)&&(!['aac','m4a'].includes(format)||rate*1000<=6*sampleRate*channels));
}
export function audioArgs(format, options={}) {
  const p=audioProfiles[format]; if(!p)throw Error('Unsupported audio format: '+format);
  const channels=options.channels??2;
  if(![1,2].includes(channels))throw Error('Audio requires mono or stereo.');
  const sample=options.sampleRate??(format==='opus'?48000:44100);
  if(!p.samples.includes(sample))throw Error('Sample rate is not supported by this audio profile.');
  const args=['-c:a',p.codec,'-ar',String(sample),'-ac',String(channels)];
  if(p.quality){const q=options.quality??5;if(!Number.isFinite(q)||q< -1||q>10)throw Error('Vorbis quality must be -1 to 10.');args.push('-q:a',String(q));}
  else if(!p.lossless){const b=options.bitrate??p.default;if(!audioRates(format,channels,sample).includes(b))throw Error('Bitrate tidak didukung untuk format, sample rate, dan kanal ini.');args.push('-b:a',b+'k');if(format==='opus')args.push('-vbr','on','-application','audio');}
  if(options.metadata)for(const key of ['title','artist','album','genre','date'])if(options.metadata[key])args.push('-metadata',key+'='+String(options.metadata[key]));
  return [...args,'-f',p.mux];
}
/** @type {Record<string,{label:string,mime:string}>} */
export const videoProfiles = {
 mp4:{label:'MP4 · H.264',mime:'video/mp4'},webm:{label:'WebM · VP8',mime:'video/webm'},mkv:{label:'MKV · H.264',mime:'video/x-matroska'},mov:{label:'MOV · H.264',mime:'video/quicktime'},avi:{label:'AVI · MPEG-4',mime:'video/x-msvideo'},ts:{label:'TS · H.264',mime:'video/mp2t'},gif:{label:'GIF',mime:'image/gif'},mpeg:{label:'MPEG · MPEG-1',mime:'video/mpeg'},mpeg2:{label:'MPEG-2 · program stream',mime:'video/mpeg'},dat:{label:'DAT · VCD MPEG-1 stream',mime:'video/mpeg'},
};
// VCD is displayed at 4:3 with non-square pixels. Fit the source DAR before
// padding so widescreen and anamorphic inputs are not squeezed or stretched.
export function vcdVideoFilter(standard='pal') {
 const h=standard==='pal'?288:240, sar=standard==='pal'?'12/11':'10/11';
 return `scale=w='max(2,trunc(min(352,${h}*dar/(${sar}))/2)*2)':h='max(2,trunc(min(${h},352/(dar/(${sar})))/2)*2)',pad=352:${h}:(ow-iw)/2:(oh-ih)/2,setsar=${sar}`;
}
export function videoArgs(format, options={}) {
 if(!videoProfiles[format])throw Error('Unsupported video format: '+format);
 if(format==='dat')return ['-target','pal-vcd','-vf',vcdVideoFilter('pal'),'-aspect','4:3','-ac','2','-f','vcd'];
 const args=[];
 if(['mp4','mkv','mov','ts'].includes(format))args.push('-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac');
 if(format==='webm')args.push('-c:v','libvpx','-deadline','realtime','-c:a','libvorbis');
 if(format==='avi')args.push('-c:v','mpeg4','-c:a','libmp3lame');
 if(['mpeg','mpeg2'].includes(format))args.push('-c:v',format==='mpeg'?'mpeg1video':'mpeg2video','-pix_fmt','yuv420p','-r','25','-c:a','mp2','-b:a','224k','-ar','44100','-ac','2','-f',format==='mpeg'?'mpeg':'vob');
 if(format==='gif')args.push('-loop','0');
 if(options.bitrate&&format!=='gif')args.push('-b:v',String(options.bitrate));
 return args;
}
