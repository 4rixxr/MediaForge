import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {Language,isLanguage,languages,translate} from '../i18n/messages';
const LanguageContext=createContext<{language:Language;setLanguage:(language:Language)=>void;t:(key:string,values?:Record<string,string|number>)=>string}|null>(null);
export function LanguageProvider({children}:{children:React.ReactNode}){
  const [language,updateLanguage]=useState<Language>(()=>{try{const saved=localStorage.getItem('mediaforge_language');return isLanguage(saved)?saved:'id'}catch{return 'id'}});
  const changed=useRef(false);
  useEffect(()=>{let active=true;window.mediaforgePreferences?.getLanguage().then(saved=>{if(active&&!changed.current&&isLanguage(saved))updateLanguage(saved)}).catch(()=>{});return()=>{active=false}},[]);
  useEffect(()=>{document.documentElement.lang=languages.find(l=>l.code===language)!.html;try{localStorage.setItem('mediaforge_language',language)}catch{}},[language]);
  const setLanguage=(next:Language)=>{if(!isLanguage(next))return;changed.current=true;updateLanguage(next);void window.mediaforgePreferences?.setLanguage(next).catch(()=>{});};
  return <LanguageContext.Provider value={{language,setLanguage,t:(key,values)=>translate(language,key,values)}}>{children}</LanguageContext.Provider>;
}
export function useLanguage(){const value=useContext(LanguageContext);if(!value)throw Error('LanguageProvider is required');return value;}
