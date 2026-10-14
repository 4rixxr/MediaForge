. (Join-Path $PSScriptRoot 'download-build-file.ps1')
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$root=Resolve-Path (Join-Path $PSScriptRoot '..')
$target=Join-Path $root 'vendor\win\bin\cdrdao'
$tempDir=Join-Path ([IO.Path]::GetTempPath()) ('mf-cdrdao-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
try {
 $archive=Join-Path $tempDir 'cdrdao126.zip'
 Receive-BuildFile 'https://github.com/cdrdao/cdrdao/releases/download/rel_1_2_6/cdrdao126.zip' -OutFile $archive
 if((Get-FileHash $archive -Algorithm SHA256).Hash -ne '653E56C49F94771F87CD9F4CEEFC255329714BA5066BD78E30EDAA464C322A3A'){throw 'CDRDAO download checksum mismatch'}
 New-Item -ItemType Directory -Path $target -Force | Out-Null
 Expand-Archive $archive -DestinationPath $target -Force
 & (Join-Path $target 'cdrdao.exe') version
 if($LASTEXITCODE -ne 0){throw 'CDRDAO or its runtime DLLs failed to load'}
 $licenses=Join-Path $root 'vendor\win\licenses\cdrdao'
 New-Item -ItemType Directory -Path $licenses -Force | Out-Null
 Receive-BuildFile 'https://github.com/cdrdao/cdrdao/releases/download/rel_1_2_6/cdrdao-1.2.6.tar.gz' -OutFile (Join-Path $licenses 'cdrdao-1.2.6.tar.gz')
 if((Get-FileHash (Join-Path $licenses 'cdrdao-1.2.6.tar.gz') -Algorithm SHA256).Hash -ne '10D15B0DC78BD44A9A4A8D7D85498C734771036159D05AA940E17F18FC40D40F'){throw 'CDRDAO source checksum mismatch'}
 Write-Host 'PASS: CDRDAO 1.2.6 verified.'
}finally{Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue}
