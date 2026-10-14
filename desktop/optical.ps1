param([Parameter(Mandatory=$true)][string]$RequestFile)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
$request=Get-Content -LiteralPath $RequestFile -Raw -Encoding UTF8 | ConvertFrom-Json
Add-Type -TypeDefinition @'
using System; using System.IO; using System.Runtime.InteropServices; using System.Runtime.InteropServices.ComTypes;
public static class OpticalStream {
 [DllImport("shlwapi.dll",CharSet=CharSet.Unicode,PreserveSig=false)]
 public static extern void SHCreateStreamOnFileEx(string file,uint mode,uint attributes,bool create,IStream reserved,out IStream stream);
 public static IStream Open(string file){IStream s;SHCreateStreamOnFileEx(file,0x20,0,false,null,out s);return s;}
 public static void Save(object value,string file){var s=(IStream)value;var p=Marshal.AllocHGlobal(4);try{using(var f=new FileStream(file,FileMode.CreateNew,FileAccess.Write)){var b=new byte[1024*1024];while(true){s.Read(b,b.Length,p);int n=Marshal.ReadInt32(p);if(n==0)break;f.Write(b,0,n);}}}finally{Marshal.FreeHGlobal(p);}}
}
'@
function Recorder([string]$id){$r=New-Object -ComObject IMAPI2.MsftDiscRecorder2;$r.InitializeDiscRecorder($id);return $r}
function DataWriter($rec){$w=New-Object -ComObject IMAPI2.MsftDiscFormat2Data;$w.Recorder=$rec;$w.ClientName='MediaForge Studio';return $w}
function CheckMedia($rec,$kind,$sectors){
 $w=DataWriter $rec
 if(!$w.IsRecorderSupported($rec) -or !$w.IsCurrentMediaSupported($rec)){throw 'Recorder atau media tidak mendukung penulisan.'}
 if(!$w.MediaPhysicallyBlank){throw 'Gunakan cakram kosong. MediaForge tidak menghapus atau menimpa cakram yang telah berisi data.'}
 $type=[int]$w.CurrentPhysicalMediaType
 if($kind -eq 'data-dvd'){if($type -notin @(5,6,7,8,9,10,11,13)){throw 'Masukkan DVD kosong yang dapat ditulis.'}}
 elseif($type -notin @(2,3)){throw 'Masukkan CD-R/CD-RW kosong.'}
 if([long]$w.FreeSectorsOnMedia -lt [long]$sectors){throw 'Kapasitas media fisik tidak cukup.'}
 return $w
}
try {
 switch($request.action){
  'probe' {
   $readers=@(Get-CimInstance Win32_CDROMDrive -ErrorAction SilentlyContinue | ForEach-Object {@{name=$_.Name;drive=$_.Drive;mediaLoaded=$_.MediaLoaded}})
   $master=New-Object -ComObject IMAPI2.MsftDiscMaster2
   $items=@()
   if($master.IsSupportedEnvironment){foreach($id in $master){$r=Recorder $id;$w=DataWriter $r;$item=@{id=[string]$id;name=($r.VendorId+' '+$r.ProductId).Trim();volumes=@($r.VolumePathNames);writable=[bool]$w.IsRecorderSupported($r);blank=$false;mediaType=0;freeSectors=0;error=''};try{$item.mediaType=[int]$w.CurrentPhysicalMediaType;$item.blank=[bool]$w.MediaPhysicallyBlank;$item.freeSectors=[long]$w.FreeSectorsOnMedia}catch{$item.error='Media kosong belum terdeteksi atau drive belum siap.'};$items+=$item}}
   @{readers=$readers;drives=$items} | ConvertTo-Json -Depth 6 -Compress
  }
  'iso' {
   $fsi=New-Object -ComObject IMAPI2FS.MsftFileSystemImage
   if($request.kind -eq 'data-dvd'){$fsi.ChooseImageDefaultsForMediaType(6);$fsi.FileSystemsToCreate=4;$fsi.UDFRevision=0x102}
   else{$fsi.ChooseImageDefaultsForMediaType(2);$fsi.FileSystemsToCreate=3;$fsi.FreeMediaBlocks=([int]$request.minutes*60*75-150)}
   $fsi.VolumeName=$request.label;$fsi.Root.AddTree($request.source,$false)
   $result=$fsi.CreateResultImage();[OpticalStream]::Save($result.ImageStream,$request.output)
   @{ok=$true;blocks=$result.TotalBlocks}|ConvertTo-Json -Compress
  }
  'check' {$r=Recorder $request.drive;$null=CheckMedia $r $request.kind $request.sectors;@{ok=$true}|ConvertTo-Json -Compress}
  'burn-data' {
   $r=Recorder $request.drive;$w=CheckMedia $r $request.kind $request.sectors
   $w.ForceMediaToBeClosed=$true;$w.ForceOverwrite=$false
   # Use only a speed returned by the actual drive/media combination.
   $speeds=@($w.SupportedWriteSpeeds | Where-Object {$_ -gt 0} | Sort-Object)
   if($speeds.Count -gt 0){$w.SetWriteSpeed([uint32]$speeds[0],$false)}
   $stream=[OpticalStream]::Open($request.image)
   try{$w.Write($stream)}finally{[void][Runtime.InteropServices.Marshal]::ReleaseComObject($stream)}
   @{ok=$true}|ConvertTo-Json -Compress
  }
  'burn-audio' {
   $r=Recorder $request.drive;$null=CheckMedia $r 'audio-cd' $request.sectors
   $w=New-Object -ComObject IMAPI2.MsftDiscFormat2TrackAtOnce
   if(!$w.IsRecorderSupported($r) -or !$w.IsCurrentMediaSupported($r)){throw 'Drive/media tidak mendukung Audio CD track-at-once.'}
   $w.Recorder=$r;$w.ClientName='MediaForge Studio';$w.DoNotFinalizeMedia=$false;$w.BufferUnderrunFreeDisabled=$false
   $w.PrepareMedia()
   try{foreach($track in $request.tracks){$stream=[OpticalStream]::Open($track);try{$w.AddAudioTrack($stream)}finally{[void][Runtime.InteropServices.Marshal]::ReleaseComObject($stream)}}}finally{$w.ReleaseMedia()}
   @{ok=$true}|ConvertTo-Json -Compress
  }
  default {throw 'Operasi optical tidak dikenal.'}
 }
}catch{[Console]::Error.WriteLine($_.Exception.Message);exit 1}
