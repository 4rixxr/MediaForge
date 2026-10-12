# Perbaikan jalur build Electron

Panduan terkini ada di [DEBUGGING_DAN_CARA_BUILD.md](DEBUGGING_DAN_CARA_BUILD.md).

Staging sekarang dilakukan setelah build dan dipakai untuk installer maupun portable. Lockfile telah disinkronkan. Penyebab EACCES yang spesifik tetap memerlukan log asli; keberhasilan packaging direktori Windows di Linux bukan pengganti pengujian installer di Windows.
