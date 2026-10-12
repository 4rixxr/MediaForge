$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$exe = Join-Path $root 'release\win-unpacked\MediaForge Studio.exe'
if (!(Test-Path $exe)) { throw "Packaged Electron executable missing: $exe" }
$process = Start-Process -FilePath $exe -ArgumentList '--smoke-test' -PassThru
if (!$process.WaitForExit(30000)) {
  Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  throw 'Packaged app startup timed out after 30 seconds'
}
if ($process.ExitCode -ne 0) { throw "Packaged app failed to start (exit $($process.ExitCode))" }
Write-Host 'PASS: packaged Electron backend and UI startup.'
