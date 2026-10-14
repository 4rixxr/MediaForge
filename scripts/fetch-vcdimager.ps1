$ErrorActionPreference='Stop'
$root=Resolve-Path (Join-Path $PSScriptRoot '..')
$msys=if($env:MEDIAFORGE_MSYS2_ROOT){$env:MEDIAFORGE_MSYS2_ROOT}else{'C:\msys64'}
$shell=Join-Path $msys 'msys2_shell.cmd'
if(!(Test-Path $shell) -or !(Test-Path (Join-Path $msys 'ucrt64\bin\vcdimager.exe'))){throw 'Install MSYS2 UCRT64 and run: pacman -S --needed mingw-w64-ucrt-x86_64-vcdimager. For a custom installation set MEDIAFORGE_MSYS2_ROOT. Or build with GitHub Actions.'}
Push-Location $root
try {
 & $shell -defterm -no-start -ucrt64 -here -c 'bash scripts/stage-vcdimager.sh'
 if($LASTEXITCODE -ne 0){throw 'VCDImager staging failed'}
 & (Join-Path $root 'vendor\win\bin\vcdimager.exe') --version
 if($LASTEXITCODE -ne 0){throw 'Staged VCDImager/DLL check failed'}
}finally{Pop-Location}
