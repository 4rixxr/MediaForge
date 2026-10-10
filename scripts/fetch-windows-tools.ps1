$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$bin = Join-Path $root 'vendor\win\bin'
New-Item -ItemType Directory -Path $bin -Force | Out-Null
$tempDir = Join-Path ([IO.Path]::GetTempPath()) ('mediaforge-build-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
try {
  $ytdlp = Join-Path $bin 'yt-dlp.exe'
  if (!(Test-Path $ytdlp)) {
    Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile $ytdlp -MaximumRedirection 10
  }
  $ffmpeg = Join-Path $bin 'ffmpeg.exe'
  $ffprobe = Join-Path $bin 'ffprobe.exe'
  if (!(Test-Path $ffmpeg) -or !(Test-Path $ffprobe)) {
    $archive = Join-Path $tempDir 'ffmpeg.zip'
    Invoke-WebRequest -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile $archive -MaximumRedirection 10
    Expand-Archive -Path $archive -DestinationPath (Join-Path $tempDir 'extracted') -Force
    foreach ($tool in @('ffmpeg.exe', 'ffprobe.exe')) {
      $found = Get-ChildItem (Join-Path $tempDir 'extracted') -File -Recurse -Filter $tool | Select-Object -First 1
      if ($null -eq $found) { throw "Missing $tool in FFmpeg archive" }
      Copy-Item $found.FullName (Join-Path $bin $tool) -Force
    }
  }
  foreach ($tool in @('yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe')) {
    $f = Join-Path $bin $tool
    if (!(Test-Path $f) -or (Get-Item $f).Length -lt 100000) { throw "Invalid binary: $f" }
  }
  & $ytdlp --version
  & $ffmpeg -version | Select-Object -First 1
  & $ffprobe -version | Select-Object -First 1
  Write-Host 'Windows tools ready.'
} finally {
  Remove-Item $tempDir -Force -Recurse -ErrorAction SilentlyContinue
}
