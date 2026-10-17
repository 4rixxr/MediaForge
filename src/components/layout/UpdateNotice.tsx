import React, {useEffect, useState} from 'react';
type UpdateInfo = {state:string;version?:string;notes?:string;percent?:number;message?:string};
export function UpdateNotice() {
 const [info,setInfo]=useState<UpdateInfo>({state:'idle'});
 useEffect(()=>window.mediaforgeUpdates?.subscribe(setInfo),[]);
 if (!['available','downloading','downloaded'].includes(info.state)) return null;
 return <aside className="mf-update-banner" role="status" aria-live="polite">
  <div><strong>{info.state==='downloaded'?'Update ready to install':info.state==='downloading'?'Downloading update…':`MediaForge ${info.version || ''} is available`}</strong>
  <p>{info.state==='downloading'?`${info.percent ?? 0}% downloaded`:info.state==='downloaded'?'Restart to install. Save your work first.':info.notes || 'A newer version of MediaForge Studio is ready.'}</p></div>
  {info.state==='available'&&<button onClick={()=>window.mediaforgeUpdates?.download()}>Download update</button>}
  {info.state==='downloaded'&&<button onClick={()=>window.mediaforgeUpdates?.install()}>Restart & install</button>}
  <button className="mf-update-dismiss" aria-label="Dismiss update notice" onClick={()=>setInfo({state:'idle'})}>×</button>
 </aside>;
}
