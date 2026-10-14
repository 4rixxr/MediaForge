$ErrorActionPreference='Stop'
$root=Resolve-Path (Join-Path $PSScriptRoot '..')
$bin=Join-Path $root 'vendor\win\bin'
# Avoid MSYS PATH: start the copied binaries and resolve DLLs from their shipped directory.
& (Join-Path $bin 'vcdimager.exe') --version
if($LASTEXITCODE -ne 0){throw 'Staged VCDImager/DLL check failed'}
& (Join-Path $bin 'cdrdao\cdrdao.exe') version
if($LASTEXITCODE -ne 0){throw 'Staged CDRDAO/DLL check failed'}
$env:MEDIAFORGE_NATIVE_TEST='1'
$env:MEDIAFORGE_FFMPEG=Join-Path $bin 'ffmpeg.exe'
$env:MEDIAFORGE_FFPROBE=Join-Path $bin 'ffprobe.exe'
$env:MEDIAFORGE_VCDIMAGER=Join-Path $bin 'vcdimager.exe'
node --test tests/media-burner-regressions.cjs tests/url-native-regressions.cjs
if($LASTEXITCODE -ne 0){throw 'Native media/image tests failed'}
Remove-Item Env:MEDIAFORGE_NATIVE_TEST
$tempDir=Join-Path ([IO.Path]::GetTempPath()) ('mf-iso-test-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path (Join-Path $tempDir 'source') -Force | Out-Null
try {
 Set-Content -LiteralPath (Join-Path $tempDir 'source\hello.txt') -Value 'MediaForge ISO test' -Encoding UTF8
 $script=Join-Path $root 'desktop\optical.ps1'
 $request=Join-Path $tempDir 'request.json'
 $powershell=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
 # No burn operation is invoked by CI. These checks create images without a drive.
 foreach($kind in @('data-cd','data-dvd')){
  $iso=Join-Path $tempDir ($kind+'.iso')
  @{action='iso';source=(Join-Path $tempDir 'source');output=$iso;kind=$kind;minutes='80';label='MF_TEST'}|ConvertTo-Json|Set-Content $request -Encoding UTF8
  & $powershell -NoProfile -NonInteractive -ExecutionPolicy RemoteSigned -Sta -File $script -RequestFile $request
  if($LASTEXITCODE -ne 0){throw "$kind ISO creation failed"}
  $bytes=[IO.File]::ReadAllBytes($iso)
  $content=[Text.Encoding]::ASCII.GetString($bytes)
  if($bytes.Length % 2048 -ne 0){throw 'Image sectors are not aligned'}
  if($kind -eq 'data-cd' -and !$content.Contains('CD001')){throw 'ISO9660 descriptor missing'}
  if($kind -eq 'data-dvd' -and !$content.Contains('NSR02')){throw 'UDF 1.02 descriptor missing'}
  if(!$content.Contains('MediaForge ISO test')){throw 'Source content missing from image'}
 }
 @{action='probe'}|ConvertTo-Json|Set-Content $request -Encoding UTF8
 & $powershell -NoProfile -NonInteractive -ExecutionPolicy RemoteSigned -Sta -File $script -RequestFile $request
 if($LASTEXITCODE -ne 0){throw 'IMAPI probe failed'}
 Write-Host 'PASS: ISO generation without hardware and optical probe. Physical burning is not exercised in CI.'
}finally{Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue}
