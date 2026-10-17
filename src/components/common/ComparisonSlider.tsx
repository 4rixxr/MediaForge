import React, { useState } from 'react';
interface ComparisonSliderProps {originalUrl:string;compressedUrl:string;originalLabel?:string;compressedLabel?:string;}
export const ComparisonSlider:React.FC<ComparisonSliderProps>=({originalUrl,compressedUrl,originalLabel='Original',compressedLabel='Compressed'})=>{
 const [position,setPosition]=useState(50);
 return <div><div className="relative h-72 sm:h-96 w-full select-none overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950/20">
 <img src={compressedUrl} alt={compressedLabel} className="absolute inset-0 h-full w-full object-contain"/>
 <img src={originalUrl} alt={originalLabel} className="absolute inset-0 h-full w-full object-contain" style={{clipPath:`inset(0 ${100-position}% 0 0)`}}/>
 <div className="absolute inset-y-0 w-0.5 bg-white" style={{left:`${position}%`}}/>
 <span className="absolute bottom-3 left-3 rounded bg-slate-900 px-2 py-1 text-xs text-white">{originalLabel}</span><span className="absolute bottom-3 right-3 rounded bg-slate-900 px-2 py-1 text-xs text-white">{compressedLabel}</span>
 </div><label className="flex items-center gap-4 mt-3 text-xs text-slate-500"><span>Compare images</span><input className="flex-1 min-w-0" aria-label="Original image visibility" type="range" min="0" max="100" value={position} onChange={e=>setPosition(Number(e.target.value))}/><span className="font-mono">{position}%</span></label></div>;
};
