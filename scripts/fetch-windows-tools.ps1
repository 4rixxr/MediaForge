. (Join-Path $PSScriptRoot 'download-build-file.ps1')
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$bin = Join-Path $root 'vendor\win\bin'
New-Item -ItemType Directory -Path $bin -Force | Out-Null
$tempDir = Join-Path ([IO.Path]::GetTempPath()) ('mediaforge-build-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
try {
  # yt-dlp needs an external JS runtime for current YouTube extraction.
  # Reuse the supported Node installation used by this Windows build.
  $nodeSource = (& node -p 'process.execPath').Trim()
  $nodeVersion = (& node -p 'process.version').Trim()
  if ($LASTEXITCODE -ne 0 -or [int]($nodeVersion.TrimStart('v').Split('.')[0]) -lt 22) { throw 'Node.js 22+ is required for the downloader runtime.' }
  Copy-Item -LiteralPath $nodeSource -Destination (Join-Path $bin 'node.exe') -Force
  $licenses=Join-Path $root 'vendor\win\licenses'
  New-Item -ItemType Directory -Path $licenses -Force | Out-Null
  # The Windows Node distribution includes LICENSE beside node.exe. Ship the
  # matching installed license instead of guessing a dist-server LICENSE URL.
  $nodeLicense=Join-Path (Split-Path -Parent $nodeSource) 'LICENSE'
  if (!(Test-Path -LiteralPath $nodeLicense -PathType Leaf)) { throw 'Node LICENSE missing beside node.exe. Install the official Windows Node distribution (or use actions/setup-node) before packaging.' }
  Copy-Item -LiteralPath $nodeLicense -Destination (Join-Path $licenses 'NODE-LICENSE.txt') -Force
  $ytdlp = Join-Path $bin 'yt-dlp.exe'
  $freshYtdlp=Join-Path $tempDir 'yt-dlp.exe'
  Receive-BuildFile -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile $freshYtdlp -MaximumRedirection 10
  & $freshYtdlp --version
  if ($LASTEXITCODE -ne 0) { throw 'Downloaded yt-dlp failed validation; previous copy has not been replaced.' }
  Move-Item -LiteralPath $freshYtdlp -Destination $ytdlp -Force
  $ffmpeg = Join-Path $bin 'ffmpeg.exe'
  $ffprobe = Join-Path $bin 'ffprobe.exe'
  if (!(Test-Path $ffmpeg) -or !(Test-Path $ffprobe)) {
    $archive = Join-Path $tempDir 'ffmpeg.zip'
    Receive-BuildFile -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile $archive -MaximumRedirection 10
    Expand-Archive -Path $archive -DestinationPath (Join-Path $tempDir 'extracted') -Force
    foreach ($tool in @('ffmpeg.exe', 'ffprobe.exe')) {
      $found = Get-ChildItem (Join-Path $tempDir 'extracted') -File -Recurse -Filter $tool | Select-Object -First 1
      if ($null -eq $found) { throw "Missing $tool in FFmpeg archive" }
      Copy-Item $found.FullName (Join-Path $bin $tool) -Force
    }
  }
  foreach ($tool in @('yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe', 'node.exe')) {
    $f = Join-Path $bin $tool
    if (!(Test-Path $f) -or (Get-Item $f).Length -lt 100000) { throw "Invalid binary: $f" }
  }
  & $ytdlp --version
  if ($LASTEXITCODE -ne 0) { throw 'yt-dlp failed to start' }
  & (Join-Path $bin 'node.exe') --version
  if ($LASTEXITCODE -ne 0) { throw 'Bundled Node runtime failed to start' }
  & $ffmpeg -version
  if ($LASTEXITCODE -ne 0) { throw 'FFmpeg failed to start' }
  & $ffprobe -version
  if ($LASTEXITCODE -ne 0) { throw 'FFprobe failed to start' }
  Write-Host 'Windows tools ready.'
} finally {
  Remove-Item $tempDir -Force -Recurse -ErrorAction SilentlyContinue
}
