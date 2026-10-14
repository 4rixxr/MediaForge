#!/usr/bin/env bash
set -euo pipefail
# Run in MSYS2 UCRT64. Capture all dynamically linked DLLs from the installed,
# signed repository packages, then validate the staged executable in PowerShell.
mkdir -p vendor/win/bin vendor/win/licenses/vcdimager
cp /ucrt64/bin/vcdimager.exe /ucrt64/bin/vcd-info.exe vendor/win/bin/
ldd /ucrt64/bin/vcdimager.exe /ucrt64/bin/vcd-info.exe > vendor/win/licenses/vcdimager/dependencies.txt
if grep -q 'not found' vendor/win/licenses/vcdimager/dependencies.txt; then exit 1; fi
awk '/\/ucrt64\/bin\/.*\.dll/ {for(i=1;i<=NF;i++) if($i ~ /^\/ucrt64\/bin\/.*\.dll$/)print $i}' vendor/win/licenses/vcdimager/dependencies.txt | sort -u | while IFS= read -r dll; do cp "$dll" vendor/win/bin/; done
pacman -Qi mingw-w64-ucrt-x86_64-vcdimager > vendor/win/licenses/vcdimager/package.txt
# Carry license files for the installed runtime dependencies as well.
cp -R /ucrt64/share/licenses/. vendor/win/licenses/vcdimager/ 2>/dev/null || true
