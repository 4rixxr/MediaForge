import {FFmpeg} from '@ffmpeg/ffmpeg';
import {fetchFile} from '@ffmpeg/util';
import {audioProfiles,videoProfiles} from '../../shared/media-profiles.js';
import {conversionArgs} from '../../shared/conversion.js';
export type FfmpegStatus='idle'|'loading'|'ready'|'error'|'fallback';
export interface FfmpegProgress {progress:number;time?:number}
type AudioOptions={bitrate?:number;quality?:number;metadata?:Record<string,string>;sampleRate?:number;channels?:1|2;startTime?:number;endTime?:number;volume?:number};
type VideoOptions={resolution?:{width:number;height:number};crop?:{x:number;y:number;width:number;height:number};bitrate?:number;fps?:number;startTime?:number;endTime?:number;removeAudio?:boolean;videoBitrate?:number};
class FFmpegService {
 private ffmpeg:FFmpeg|null=null;
 private status:FfmpegStatus='idle';
 private loadPromise:Promise<boolean>|null=null;
 private operationQueue:Promise<unknown>=Promise.resolve();
 private logs:string[]=[];
 private serialize<T>(operation:()=>Promise<T>):Promise<T>{const result=this.operationQueue.then(operation,operation);this.operationQueue=result.catch(()=>undefined);return result;}
 public getStatus(){return this.status;}
 public isAvailable(){return this.status==='ready';}
 private native(){return typeof window!=='undefined'?window.mediaforgeMedia:undefined;}
 public async load(onProgress?:(message:string)=>void):Promise<boolean>{
  if(this.native()){this.status='ready';return true;}
  if(this.status==='ready'&&this.ffmpeg)return true;
  if(this.loadPromise)return this.loadPromise;
  this.loadPromise=(async()=>{
   this.status='loading';onProgress?.('Memuat engine konversi dari paket aplikasi…');
   const engine=new FFmpeg();this.ffmpeg=engine;
   engine.on('log',({message})=>{this.logs.push(message);if(this.logs.length>50)this.logs.shift();});
   try{
    const base=new URL('./ffmpeg/',document.baseURI);
    await engine.load({coreURL:new URL('ffmpeg-core.js',base).href,wasmURL:new URL('ffmpeg-core.wasm',base).href});
    this.status='ready';return true;
   }catch(error){engine.terminate();this.ffmpeg=null;this.status='error';console.error('Engine initialization failed',error);return false;}
   finally{this.loadPromise=null;}
  })();
  return this.loadPromise;
 }
 private async convert(file:File,kind:'audio'|'video'|'audio-video',format:string,options:AudioOptions|VideoOptions,onProgress?:(percent:number)=>void):Promise<Blob>{
  const input='input_'+crypto.randomUUID(),output='output_'+crypto.randomUUID()+'.'+format;
  const args=conversionArgs(kind,format,options,input,output);
  const native=this.native();
  if(native){
   const id=crypto.randomUUID(),unsubscribe=native.subscribe(p=>{if(p.id===id)onProgress?.(p.percent);});
   try{onProgress?.(1);const result=await native.convert(id,{kind,format,options,bytes:await file.arrayBuffer()});onProgress?.(100);return new Blob([result.bytes as BlobPart],{type:result.mime});}finally{unsubscribe();}
  }
  // The distributed ffmpeg.wasm core has an upstream Opus 48 kHz stack overflow.
  // Use the browser's real Opus encoder and an Ogg muxer, preserving rate/channels.
  if(kind==='audio'&&format==='opus'){
   const audio=options as AudioOptions;
   const {Output,OggOutputFormat,BufferTarget,AudioBufferSource,Quality}=await import('mediabunny');
   if(typeof AudioEncoder==='undefined')throw Error('Encoder Opus tidak tersedia di browser ini. Gunakan aplikasi desktop atau browser dengan WebCodecs AudioEncoder.');
   const pcm=await this.convert(file,'audio','wav',{...audio,sampleRate:48000,metadata:undefined},p=>onProgress?.(Math.round(p*.65)));
   const context=new OfflineAudioContext(audio.channels??2,1,48000);
   const decoded=await context.decodeAudioData(await pcm.arrayBuffer());
   const target=new BufferTarget(),output=new Output({format:new OggOutputFormat(),target});
   const source=new AudioBufferSource({codec:'opus',quality:new Quality({bitrate:(audio.bitrate??128)*1000}),transform:{sampleRate:audio.sampleRate??48000,numberOfChannels:audio.channels??2}});
   output.addAudioTrack(source);
   const tags=audio.metadata||{};
   output.setMetadataTags({title:tags.title,artist:tags.artist,album:tags.album,genre:tags.genre,raw:tags.date?{DATE:tags.date}:undefined});
   try{await output.start();await source.add(decoded);source.close();await output.finalize();if(!target.buffer?.byteLength)throw Error('Encoder Opus menghasilkan berkas kosong.');onProgress?.(100);return new Blob([target.buffer],{type:audioProfiles.opus.mime});}
   catch(error){await output.cancel();throw error;}
  }
  if(!await this.load()||!this.ffmpeg)throw Error('Engine konversi tidak dapat dimuat. Pastikan folder ffmpeg ikut dalam build; jalankan npm run build lalu buka aplikasi melalui HTTP.');
  const engine=this.ffmpeg;
  const progress=({progress}:{progress:number})=>onProgress?.(Math.min(99,Math.max(1,Math.round(progress*100))));
  this.logs=[];engine.on('progress',progress);
  try{
   onProgress?.(1);await engine.writeFile(input,await fetchFile(file));
   const code=await engine.exec(args);
   if(code!==0)throw Error('Conversion failed: '+this.logs.slice(-6).join('\n'));
   const bytes=await engine.readFile(output);if(!bytes.length)throw Error('Encoder menghasilkan berkas kosong.');
   onProgress?.(100);return new Blob([bytes as BlobPart],{type:(kind==='audio'?audioProfiles[format]:videoProfiles[format]).mime});
  }catch(error){
   if(/memory|Aborted|out of bounds/i.test(String(error))){engine.terminate();this.ffmpeg=null;this.status='error';}
   throw error;
  }finally{engine.off('progress',progress);if(this.ffmpeg===engine)await Promise.allSettled([engine.deleteFile(input),engine.deleteFile(output)]);}
 }
 public convertAudioWithFFmpeg(file:File,format:string,options:AudioOptions={},progress?:(n:number)=>void){return this.serialize(()=>this.convert(file,'audio',format,options,progress));}
 public convertVideoWithFFmpeg(file:File,format:string,options:VideoOptions={},progress?:(n:number)=>void){return this.serialize(()=>this.convert(file,'video',format,options,progress));}
 public audioToVideo(file:File,format:string,options:VideoOptions={},progress?:(n:number)=>void){return this.serialize(()=>this.convert(file,'audio-video',format,options,progress));}
}
export const ffmpegService=new FFmpegService();
