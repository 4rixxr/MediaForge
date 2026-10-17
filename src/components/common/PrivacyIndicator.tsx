import React, { useRef } from 'react';
import { ShieldCheck, X } from 'lucide-react';
export const PrivacyIndicator: React.FC<{compact?:boolean}> = ({compact=false}) => {
 const dialog=useRef<HTMLDialogElement>(null);
 return <><div className={compact?'inline-flex':'studio-notice flex flex-wrap items-center justify-between gap-3'}><span className="flex items-center gap-2 text-xs"><ShieldCheck size={16}/>{compact?'Local processing':'Your media is processed on this device.'}</span><button className="ml-3 text-xs font-semibold underline underline-offset-4" onClick={()=>dialog.current?.showModal()}>How it works</button></div>
 <dialog ref={dialog} className="studio-dialog" aria-labelledby="privacy-title"><div className="flex items-center justify-between gap-4"><h3 id="privacy-title" className="text-lg font-semibold">Your files stay with you</h3><button autoFocus className="studio-button" aria-label="Close privacy details" onClick={()=>dialog.current?.close()}><X size={16}/></button></div><p>MediaForge processes media with browser APIs and FFmpeg. It does not upload your media to a conversion server.</p><p>The conversion engine is included in the application build. File-size limits and performance depend on your browser and available memory.</p><p>History stores file names and sizes in this browser. Clear it in Settings. Download results before leaving the tool.</p></dialog></>;
};
