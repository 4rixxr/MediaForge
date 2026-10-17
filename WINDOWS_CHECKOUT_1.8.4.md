# MediaForge Studio 1.8.4 — perbaikan skrip build Windows

## Kegagalan yang berhasil direproduksi

`scripts/stage-vcdimager.sh` memakai Bash dan `set -euo pipefail`. Jika akhir baris skrip berubah menjadi CRLF, Bash membaca karakter CR sebagai bagian dari nama opsi. Menjalankan awal skrip dengan CRLF menghasilkan exit code 2 dan `pipefail: invalid option name`, sebelum penyiapan VCD selesai.

Paket 1.8.3 belum memiliki aturan Git untuk mempertahankan LF pada skrip tersebut. Ini merupakan kegagalan yang bisa direproduksi; tanpa log run pengguna, belum diketahui apakah penyebabnya sama dengan kegagalan Build EXE yang dilaporkan.

## Perubahan

- `.gitattributes` menetapkan LF untuk skrip Bash dan source build. Berkas `.cmd` memakai CRLF.
- `scripts/normalize-shell-scripts.cjs` menghapus BOM UTF-8 dan menormalkan CRLF/CR menjadi LF pada skrip `.sh` di root dan `scripts`. Isi perintah tetap sama.
- Workflow installer dan portable menjalankan normalisasi setelah setup Node, sebelum penyiapan engine VCD. Normalisasi juga dijalankan oleh `BUILD_INSTALLER_WINDOWS.cmd`.
- Dua tes regresi memeriksa checkout Git dengan `core.autocrlf=true` dan pemulihan skrip BOM/CRLF tanpa perubahan perintah. Tes tidak memerlukan Bash di PATH Windows.
- Versi source dan lockfile diselaraskan menjadi 1.8.4. Perbaikan ASAR/updater dan pencatatan diagnostik dari versi sebelumnya tetap disertakan.

## Validasi lokal

Lingkungan: Linux, Node.js 24.19.0; simulasi checkout Windows menggunakan Git. Runner Actions tetap menggunakan Node.js 22 x64.

- Pemeriksaan input build: lulus.
- Pemeriksaan TypeScript (`npm run lint`): lulus.
- Tes dengan FFmpeg/FFprobe native dan VCDImager: 25 lulus, 0 gagal, 0 dilewati. Termasuk dua tes baru untuk akhir baris. Log ada di `review/regressions-1.8.4.log`.
- `npm run prepare:desktop`: build UI, penyiapan dependensi runtime terkunci, dan validasi staging lulus. Log ada di `review/staging-1.8.4.log`.
- Arsip ASAR dibuat dari staging lokal dan diperiksa: UI, backend, burner, FFmpeg.wasm, serta `electron-updater` ditemukan. Ini pengujian arsip lokal, bukan hasil installer Windows.
- Tiga berkas workflow dapat diparse sebagai YAML. Ini bukan eksekusi workflow di GitHub.

Belum dijalankan di lingkungan ini: `electron-builder` untuk Windows, pemeriksaan PowerShell/IMAPI, smoke test EXE pada Windows, atau pembakaran ke drive fisik. Hasil lokal tidak membuktikan seluruh proses Build EXE sudah berhasil di GitHub.

## Memakai perbaikan

Ikuti `MULAI_DI_SINI.md`. Salin seluruh isi folder source, termasuk `.gitattributes`, `.github`, `scripts`, dan `tests`; commit perubahan; lalu buat **Run workflow baru** pada commit tersebut. Re-run pada run lama tetap memakai commit lama.

Jika masih gagal, kirim URL run atau teks **langkah pertama yang merah**, termasuk sekitar 20 baris sebelum error. Sertakan commit pada langkah `Show source commit`. Artifact `MediaForge-Setup-Build-Diagnostics` atau `MediaForge-Portable-Build-Diagnostics` juga dapat membantu jika sudah tersedia. Pesan `Process completed with exit code 1` saja tidak menunjukkan akar masalah.
