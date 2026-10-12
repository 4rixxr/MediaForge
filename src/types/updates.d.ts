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
