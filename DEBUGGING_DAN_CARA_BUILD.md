> Catatan versi sebelumnya. Untuk source 1.8.0, gunakan [MULAI_DI_SINI.md](MULAI_DI_SINI.md) dan [PERBAIKAN_1.8.0.md](PERBAIKAN_1.8.0.md).

# MediaForge — hasil debugging dan cara build

Diperiksa dari `MF Lastest.zip` pada 11 Oktober 2026. Versi aplikasi tetap 1.7.0.

## Temuan utama yang diperbaiki

| Masalah | Dampak | Perbaikan |
|---|---|---|
| Installer menjalankan staging sebelum `vite build` | Pada checkout baru pasti gagal: `Hasil build tidak ditemukan: dist` | Kedua perintah packaging memakai satu jalur: build → staging → npm ci runtime → verifikasi → Electron Builder |
| Portable tidak menjalankan staging sama sekali | Folder `.mediaforge-app` yang diwajibkan konfigurasi tidak tersedia | Portable memakai jalur persiapan yang sama dengan installer |
| Lockfile masih versi metadata 1.3.0 dan tidak memuat Electron, builder, updater | `npm ci` tidak sesuai manifest; `npm install` di setiap build memilih versi baru | Lockfile disinkronkan; workflow memakai `npm ci` |
| `clean` menghapus `server.js` dan memakai `rm` | Backend ikut hilang; tidak cocok dengan CMD Windows | Script Node hanya membersihkan dist, release, dan staging |
| yt-dlp tidak menerima lokasi FFmpeg bawaan aplikasi | Merge, ekstrak audio, dan trim bisa gagal pada PC tanpa FFmpeg di PATH | Tambahkan `--ffmpeg-location` serta abaikan konfigurasi yt-dlp eksternal |
| Rasio crop video terbawa saat beralih ke audio | Backend menolak permintaan audio | Reset pengaturan dan normalisasi payload audio |
| Selektor video mempunyai fallback `/best` tanpa batas | Pilihan maksimum 720p bisa menghasilkan video lebih besar | Semua fallback mengikuti batas resolusi |
| Audio original tidak selalu diekstrak; MKV tidak selalu di-remux | Hasil bisa tetap video atau kontainernya tidak sesuai pilihan | Ekstrak audio memakai `-x --audio-format best`; MKV di-remux |
| Crop bisa menghasilkan dimensi ganjil | Encoder tertentu menolak ukuran hasil | Bulatkan dimensi crop ke bilangan genap |
| Pemilihan port membuka lalu menutup socket sebelum server dimulai | Ada peluang port diambil proses lain; error listen tidak ditangani | Server langsung bind port 0; startup menunggu listen dan menangani penolakan |
| Auto-updater installer ikut aktif pada portable | Portable menawarkan jalur update yang tidak sesuai | Nonaktifkan auto-updater NSIS pada portable |
| Packaging pada tag bisa mencoba publish | Build artefak dapat membutuhkan token release tanpa dimaksudkan pengguna | `--publish never`; hasil diunggah sebagai Actions artifact |
| Nama portable menyerupai installer | Mudah salah memilih file | Nama Portable dan Setup dibedakan |
| Error aplikasi CLI pendukung tidak diperiksa satu per satu | Tahap download tools bisa terlihat sukses walau binary gagal dijalankan | PowerShell memeriksa exit code yt-dlp, FFmpeg, dan FFprobe |

Tambahan: input URL dikunci saat proses berjalan agar hasil analisis tidak tertukar dengan URL yang baru diketik; stream file ditutup saat klien terputus; origin proxy development dinormalisasi hanya untuk origin lokal yang dikenal.

## Bukti validasi

- Error staging sebelum build direproduksi dari script asli.
- Instalasi bersih `npm ci --ignore-scripts` berhasil di Linux (Node 24.19.0). Flag ini hanya untuk pengujian di sini; workflow Windows menjalankan `npm ci` normal agar binary Electron terpasang.
- `npm run lint` berhasil.
- Tes inti sebelumnya berhasil: WAV/resampling, MIME gambar, antrean FFmpeg, cleanup saat gagal, dan fallback audio.
- Tes baru: 11 tes lulus, 0 gagal. Pengujian downloader menjalankan HTTP server sungguhan dengan eksekusi yt-dlp/FFmpeg diganti simulasi; ini tidak membuktikan download YouTube langsung.
- `npm run prepare:desktop` berhasil; dependensi runtime terpasang dari lockfile, tanpa Vite/Electron Builder di staging.
- Ketiga workflow lolos parsing YAML.
- Electron Builder berhasil membuat folder Windows `win-unpacked` dan `app.asar` di Linux menggunakan `--dir --publish never -c.win.signAndEditExecutable=false`. Isi ASAR diperiksa: UI, backend, main, preload, updater.
- Toolchain yang terkunci: Electron 38.8.6, electron-builder 26.15.3, electron-updater 6.8.9.

**Batas validasi:** belum menjalankan GitHub Actions milik pengguna, belum membangun installer NSIS/portable final di Windows, dan belum menjalankan aplikasi Windows di lingkungan ini. Pengemasan lokal di atas melewati pengeditan resource/signing Windows dan tidak menyertakan binary downloader; output uji tidak dibagikan sebagai aplikasi jadi. Workflow Windows yang disertakan mengunduh tools sebenarnya, memverifikasi isi paket, dan menjalankan smoke test startup aplikasi sebelum mengunggah artefak.

Log kegagalan GitHub yang persis tidak disertakan dalam ZIP. Karena itu penyebab spesifik error `spawn EACCES` sebelumnya belum dapat dipastikan. Masalah build di atas nyata dan telah diperbaiki, tetapi bukan bukti bahwa semua kemungkinan EACCES berasal dari satu penyebab.

## Cara menerapkan di GitHub

1. Ekstrak ZIP ini.
2. Salin **isi folder `mf_electron_builder`** ke root repository yang digunakan untuk build. `package.json` dan `package-lock.json` harus sejajar dengan folder `.github`, `src`, `desktop`, dan `scripts`. Jangan hanya mengunggah ZIP, dan jangan menaruh semuanya satu tingkat lebih dalam.
3. Pastikan file `.github/workflows/windows-installer.yml` dan `windows-portable.yml` benar-benar ikut diperbarui. Folder `.github` dapat tersembunyi di aplikasi file tertentu.
4. Commit seluruh perubahan ke branch yang dipilih.
5. Buka **Actions → Build Windows All-in-One Installer → Run workflow**, pilih branch yang berisi perbaikan.
6. **Jangan memakai Re-run jobs pada run lama.** GitHub mengulang commit lama pada run tersebut. Buat run baru setelah commit perbaikan. Step `Show source commit` memperlihatkan commit yang sedang dibangun.
7. Tunggu semua step hijau, lalu unduh artifact **MediaForge-Studio-Windows-Setup**. Di dalamnya terdapat `MediaForge-Studio-Setup-1.7.0-Windows-x64.exe`.
8. Untuk portable, jalankan workflow **Build Windows Portable EXE**, unduh artifact **MediaForge-Studio-Windows-Portable**.

Jika masih gagal, kirim log teks dari step merah, khususnya **pesan error pertama beserta sekitar 20 baris sebelumnya**, serta commit pada `Show source commit`. Artifact diagnostik builder akan dilampirkan bila file diagnostiknya sempat dibuat.

## Build di komputer Windows

Install Node.js 22 (minimal 22.12), lalu jalankan `BUILD_INSTALLER_WINDOWS.cmd`. Atau:

```powershell
npm ci
npm run verify:electron
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/fetch-windows-tools.ps1
npm run lint
npm test
npm run package:win
# Pilihan portable:
npm run package:win:portable
```

Jangan menjalankan staging manual sebelum build. Perintah `package:win` dan `package:win:portable` sudah mengurus urutannya.

## Catatan yang belum diselesaikan oleh patch build ini

- FFmpeg.wasm pada konversi di browser masih mengunduh core dari unpkg. Bundling FFmpeg.exe untuk downloader belum membuat seluruh konversi browser bekerja offline. Kegagalan load awal juga masih tersimpan pada sesi tersebut; restart diperlukan untuk mencoba lagi.
- Riwayat dan tema browser menggunakan localStorage, sedangkan aplikasi memakai port lokal dinamis. Persistensi antarpeluncuran desktop belum dijamin. Ini perlu migrasi penyimpanan desktop terpisah, bukan sekadar perbaikan build.
- Auto-update masih menunjuk `4rixxr/MediaForge-Releases` sesuai konfigurasi sumber. Pastikan repository itu memang tujuan yang benar. Build ini tidak menerbitkan release otomatis. Untuk update versi selanjutnya, naikkan versi dan unggah installer, latest.yml, serta blockmap ke release yang benar.
- Unduhan platform langsung, semua alat media, rendering UI Windows, dan instalasi/uninstall belum diuji menyeluruh. Metadata/akses situs dapat berubah.

## Referensi teknis

- Struktur dua package Electron Builder: https://www.electron.build/v26/docs/tutorials/two-package-structure/
- Isi paket: https://www.electron.build/v26/docs/contents/
- Opsi yt-dlp: https://github.com/yt-dlp/yt-dlp#usage-and-options
- GitHub: menjalankan ulang workflow menggunakan SHA/ref run semula: https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/re-running-workflows-and-jobs
