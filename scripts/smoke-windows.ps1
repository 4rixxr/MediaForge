$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$exe = Join-Path $root 'release\win-unpacked\MediaForge Studio.exe'
if (!(Test-Path $exe)) { throw "Packaged Electron executable missing: $exe" }
$logs=Join-Path $root 'ci-logs'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$stdout=Join-Path $logs 'electron-smoke.stdout.log'
$stderr=Join-Path $logs 'electron-smoke.stderr.log'
$env:ELECTRON_ENABLE_LOGGING='1'
# A parent's Node mode would prevent the packaged Electron app from starting.
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$process = Start-Process -FilePath $exe -ArgumentList '--smoke-test' -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
if (!$process.WaitForExit(120000)) {
  Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  throw 'Packaged app startup timed out after 120 seconds; see Electron smoke logs.'
}
$process.Refresh()
Get-Content $stdout -ErrorAction SilentlyContinue | Write-Host
Get-Content $stderr -ErrorAction SilentlyContinue | Write-Host
if ($process.ExitCode -ne 0) { throw "Packaged app failed to start (exit $($process.ExitCode))" }
Write-Host 'PASS: packaged Electron UI, preload, IPC and actual Opus conversion.'
