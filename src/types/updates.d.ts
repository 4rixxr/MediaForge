export {};
declare global {
  interface Window { mediaforgePreferences?: {
    getLanguage():Promise<string|null>;
    setLanguage(language:string):Promise<boolean>;
  }; }
  interface Window { mediaforgeUpdates?: {
    version():Promise<string>;
    check():Promise<{ok:boolean;message?:string}>;
    download():Promise<{ok:boolean;message?:string}>;
    install():Promise<{ok:boolean;message?:string}>;
    subscribe(callback:(message:{state:string;version?:string;notes?:string;percent?:number;message?:string})=>void):()=>void;
  }; }
}

export interface BurnerFile {id:string;name:string;bytes:number}
export interface BurnerStatus {readers:{name:string;drive:string}[];drives:{id:string;name:string;volumes:string[];writable:boolean;blank:boolean;mediaType:number;freeSectors:number;error:string}[];vcdImage:boolean;physicalVcd:boolean;vcdDrives:{id:string;name:string}[];vcdError:string}
export interface BurnerProject {id:string;kind:string;bytes:number;sectors:number;imageType:string}
declare global {interface Window {mediaforgeBurner?: {
 status:()=>Promise<BurnerStatus>;choose:()=>Promise<BurnerFile[]>;
 build:(r:{kind:string;standard:string;minutes:string;files:string[]})=>Promise<BurnerProject>;
 save:(id:string)=>Promise<string|null>;
 burn:(id:string,drive:string)=>Promise<{ok?:boolean;cancelled?:boolean}>;
 subscribe:(fn:(p:{message:string})=>void)=>()=>void;
}}}

declare global {interface Window {mediaforgeMedia?:{
 inspect:(bytes:ArrayBuffer)=>Promise<{streams:Array<{codec_type:string;codec_name?:string;width?:number;height?:number;sample_rate?:string;channels?:number;display_aspect_ratio?:string;avg_frame_rate?:string}>;format:{duration?:string;bit_rate?:string}}>;
 convert:(id:string,request:{kind:string;format:string;options:Record<string,unknown>;bytes:ArrayBuffer})=>Promise<{bytes:Uint8Array;mime:string;duration:number}>;
 subscribe:(fn:(p:{id:string;percent:number})=>void)=>()=>void;
}}}
