> Catatan versi sebelumnya. Untuk source 1.8.0, gunakan [MULAI_DI_SINI.md](MULAI_DI_SINI.md) dan [PERBAIKAN_1.8.0.md](PERBAIKAN_1.8.0.md).

# Perbaikan jalur build Electron

Panduan terkini ada di [DEBUGGING_DAN_CARA_BUILD.md](DEBUGGING_DAN_CARA_BUILD.md).

Staging sekarang dilakukan setelah build dan dipakai untuk installer maupun portable. Lockfile telah disinkronkan. Penyebab EACCES yang spesifik tetap memerlukan log asli; keberhasilan packaging direktori Windows di Linux bukan pengganti pengujian installer di Windows.
