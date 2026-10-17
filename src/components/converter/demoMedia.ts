export function demoAudio(): File {
  const rate=22050, samples=rate*3, bytes=new ArrayBuffer(44+samples*2), v=new DataView(bytes);
  const text=(at:number,s:string)=>Array.from(s).forEach((c,i)=>v.setUint8(at+i,c.charCodeAt(0)));
  text(0,'RIFF');v.setUint32(4,36+samples*2,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,samples*2,true);
  for(let i=0;i<samples;i++) v.setInt16(44+i*2,Math.sin(i/rate*440*Math.PI*2)*6000*Math.min(1,i/1000,(samples-i)/1000),true);
  return new File([bytes],'Contoh-audio.wav',{type:'audio/wav'});
}
export async function demoVideo(): Promise<File> {
  if(typeof MediaRecorder==='undefined'||!MediaRecorder.isTypeSupported('video/webm')) throw Error('Contoh video tidak tersedia pada browser ini. Pilih video dari perangkat.');
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
  const ctx=canvas.getContext('2d')!;
  const audio=new AudioContext();await audio.resume();
  const oscillator=audio.createOscillator(),volume=audio.createGain(),destination=audio.createMediaStreamDestination();
  oscillator.frequency.value=440;volume.gain.value=.1;oscillator.connect(volume).connect(destination);oscillator.start();
  const stream=canvas.captureStream(24);destination.stream.getAudioTracks().forEach(track=>stream.addTrack(track));
  let frame=0;
  const draw=()=>{ctx.fillStyle='#f5f2ff';ctx.fillRect(0,0,640,360);ctx.fillStyle='#8056f5';ctx.beginPath();ctx.arc(320+Math.sin(frame++/14)*75,145,40,0,Math.PI*2);ctx.fill();ctx.font='22px sans-serif';ctx.textAlign='center';ctx.fillText('MediaForge · Contoh video',320,255);};
  draw();const timer=setInterval(draw,40);
  try {
    return await new Promise<File>((resolve,reject)=>{
      const recorder=new MediaRecorder(stream,{mimeType:'video/webm'}),chunks:Blob[]=[];
      const stop=setTimeout(()=>recorder.stop(),2000);
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
      recorder.onerror=()=>{clearTimeout(stop);reject(Error('Contoh video gagal dibuat.'))};
      recorder.onstop=()=>{clearTimeout(stop);resolve(new File(chunks,'Contoh-video.webm',{type:'video/webm'}))};
      recorder.start();
    });
  } finally {clearInterval(timer);stream.getTracks().forEach(t=>t.stop());oscillator.stop();await audio.close();}
}
