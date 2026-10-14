import {useEffect,useRef} from 'react';

// Revoke only removed URLs, not every preview whenever a list item changes.
export function useObjectUrls(urls: (string|undefined)[]) {
  const previous=useRef(new Set<string>());
  useEffect(()=>{
    const next=new Set(urls.filter((url):url is string=>!!url));
    for(const url of previous.current)if(!next.has(url))URL.revokeObjectURL(url);
    previous.current=next;
  });
  useEffect(()=>()=>{for(const url of previous.current)URL.revokeObjectURL(url);previous.current.clear();},[]);
}
