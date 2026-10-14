import {mediaFileCategory} from './mediaFileType';
import {MediaMetadata} from '../types/media';
import {loadImageFromFile} from './imageProcessor';
export async function inspectMediaFile(file:File):Promise<MediaMetadata>{
 const base:MediaMetadata={fileName:file.name,fileSize:file.size,fileType:file.type||'application/octet-stream',lastModified:file.lastModified};
 const ratio=(width:number,height:number)=>{const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;const d=gcd(width,height);return `${width/d}:${height/d}`;};
 if(file.type.startsWith('image/')||/\.(png|jpe?g|webp|bmp|ico|avif|gif|svg)$/i.test(file.name)){
  const img=await loadImageFromFile(file);return {...base,width:img.naturalWidth,height:img.naturalHeight,aspectRatio:ratio(img.naturalWidth,img.naturalHeight)};
 }
 if(['document',null].includes(mediaFileCategory(file)))return base;
 if(window.mediaforgeMedia?.inspect){
  const info=await window.mediaforgeMedia.inspect(await file.arrayBuffer()),v=info.streams.find(s=>s.codec_type==='video'),a=info.streams.find(s=>s.codec_type==='audio');
  return {...base,duration:Number(info.format.duration)||undefined,bitrate:Number(info.format.bit_rate)||undefined,width:v?.width,height:v?.height,aspectRatio:v?.display_aspect_ratio,videoCodec:v?.codec_name,audioCodec:a?.codec_name,sampleRate:Number(a?.sample_rate)||undefined,audioChannels:a?.channels};
 }
 const {Input,ALL_FORMATS,BlobSource}=await import('mediabunny');
 const input=new Input({formats:ALL_FORMATS,source:new BlobSource(file)});
 try{
  const v=await input.getPrimaryVideoTrack(),a=await input.getPrimaryAudioTrack(),duration=await input.computeDuration();
  const width=v?await v.getDisplayWidth():undefined,height=v?await v.getDisplayHeight():undefined;
  return {...base,duration,bitrate:duration>0?Math.round(file.size*8/duration):undefined,width,height,aspectRatio:width&&height?ratio(width,height):undefined,videoCodec:v?(await v.getCodec())||undefined:undefined,audioCodec:a?(await a.getCodec())||undefined:undefined,sampleRate:a?await a.getSampleRate():undefined,audioChannels:a?await a.getNumberOfChannels():undefined};
 }catch{return base;}finally{input.dispose();}
}
