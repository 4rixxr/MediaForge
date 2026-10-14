# Pemeriksaan GitHub Actions — 1.8.3

Paket source ini melanjutkan audit fitur 1.8.2. Fokus perubahan adalah pemeriksaan build dan diagnosis kegagalan installer/portable. Tidak ada run GitHub Actions atau EXE Windows yang benar-benar dijalankan pada lingkungan Linux pemeriksaan ini.

## Perubahan

- Pemeriksaan awal memvalidasi versi dan spesifikasi dependency package.json/lockfile, kelengkapan source, dependensi Electron, direktori staging, dan sintaks JavaScript. Versi yang tidak cocok ditolak sebelum pengunduhan tool atau pembuatan installer.
- Workflow memeriksa sintaks semua skrip PowerShell di scripts/desktop sebelum menjalankan tahap native. Pemeriksaan ini akan berjalan di runner Windows; parser PowerShell tidak tersedia untuk dijalankan lokal di sini.
- Node untuk runner ditetapkan arsitektur x64 agar sesuai target EXE. npm ci secara eksplisit memasang devDependencies, termasuk Electron dan electron-builder.
- Pengunduhan yt-dlp, FFmpeg dan CDRDAO mendapat maksimum tiga percobaan. Checksum CDRDAO dan pemeriksaan executable tetap dipertahankan. Helper retry memakai sintaks Windows PowerShell 5.1/PowerShell 7, bukan flag retry yang hanya tersedia pada versi baru.
- Smoke test Electron menyimpan stdout/stderr di ci-logs, membersihkan ELECTRON_RUN_AS_NODE untuk proses aplikasi, dan memberi waktu 120 detik sebelum dianggap timeout. Kegagalan tetap menggagalkan job; tidak disembunyikan dengan continue-on-error.
- Log npm ci, regresi, pengemasan, smoke Electron dan diagnosis builder diunggah melalui langkah always(), sehingga lebih mudah mengidentifikasi tahap gagal.
- Pemeriksaan executable hasil paket secara eksplisit mencakup node.exe selain FFmpeg, yt-dlp dan tool burner.

## Yang diperiksa lokal

- YAML kedua workflow dapat diparse dan struktur langkah sesuai: 18 langkah per workflow.
- Pemeriksaan source/lockfile dan tes penolakan versi/dependensi tidak cocok.
- TypeScript, build web produksi, staging aplikasi dan dependensi electron-updater.
- Pembuatan ASAR dari staging serta pemeriksaan isi ASAR. Ini bukan pembuatan/peluncuran installer EXE Windows.
- Tes regresi dan native FFmpeg/VCDImager lokal; log terbaru disertakan di review/*1.8.3.log.

Tidak ditemukan reproduksi baru dari error updater ASAR lama; normalisasi path Windows tetap dipertahankan. Penambahan pemeriksaan dan retry bukan jaminan layanan unduhan, runner, IMAPI atau installer Windows tidak akan gagal. Windows PowerShell, MSYS2 Windows, NSIS, dan aplikasi hasil EXE masih memerlukan run Windows nyata. Rincian fitur dan batas burner tetap ada di AUDIT_FITUR_1.8.2.md.

## Membuat installer yang diperbarui

1. Ekstrak ZIP dan salin seluruh isi mf_electron_builder ke root repository, termasuk folder .github, scripts, desktop, shared, src dan kedua berkas package.
2. Commit perubahan. Pastikan Actions menampilkan commit tersebut pada langkah Show source commit.
3. Pilih Build Windows All-in-One Installer → Run workflow. Buat run baru; Re-run jobs pada run lama tetap memakai source lama.
4. Jika berhasil, unduh artifact MediaForge-Studio-Windows-Setup. Nama EXE: MediaForge-Studio-Setup-1.8.3-Windows-x64.exe.
5. Jika gagal, kirim log langkah merah dan artifact MediaForge-Setup-Build-Diagnostics. Portable memakai artifact MediaForge-Portable-Build-Diagnostics. Log publik jangan disertai token atau kredensial.

Paket ini adalah source, bukan file installer. Belum ada tautan run/log GitHub terbaru dari pengguna untuk dibandingkan dengan perbaikan ini.
