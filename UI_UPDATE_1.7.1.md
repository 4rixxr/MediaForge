# MediaForge 1.7.1 — tampilan Converter

Halaman utama mengikuti struktur referensi yang diberikan: toolbar filter, empat kartu statistik, panel Siapkan berkas dengan dua kolom, antrean konversi, dan tabel riwayat. Sidebar kiri beserta daftar fitur dipertahankan. Warna tombol dan kontrol diseragamkan menjadi ungu, putih, dan abu muda; judul serif pada dashboard lama dihapus.

## Pengoperasian

1. Pilih Audio → Audio, Video → Audio, Video → Video, atau Audio → Video.
2. Pilih/drop berkas, atau buat Contoh berkas. Contoh adalah WAV/video sintetis yang dibuat langsung di perangkat.
3. Atur format keluaran, kualitas, kanal audio atau frame rate video.
4. Klik Konversi sekarang. Pekerjaan masuk ke antrean dan dijalankan berurutan.
5. Unduh setiap hasil atau gunakan Unduh hasil untuk ZIP beberapa keluaran. Bersihkan selesai menghapus hasil sesi dari antrean, sedangkan catatan riwayat tetap ada.

Jeda antrean menghentikan pemrosesan berkas berikutnya setelah tugas aktif selesai; tombol tidak mengklaim menjeda encoder di tengah pekerjaan. Audio → Video menghasilkan video 720p berlatar polos dengan trek audio sumber, dalam MP4/WebM. WAV/FLAC menonaktifkan pilihan bitrate lossy; WAV memakai PCM 16-bit.

Filter dan angka ringkasan berasal dari pekerjaan/riwayat sesungguhnya, tanpa statistik dummy. Ukuran hasil dan durasi pengerjaan tidak direkayasa sebagai perkiraan pasti ketika metadata belum cukup.

Overview, File converter, dan Batch queue membuka ruang konversi terpadu. Semua alat lainnya, URL downloader, pengaturan tema, dan pencarian tetap tersedia. Tampilan menyesuaikan layar ponsel dan mendukung tema gelap.

## Hasil pengujian

- TypeScript dan production build: lulus.
- Tes regresi inti serta 11 tes build/backend sebelumnya: lulus.
- Browser Chromium: 4 mode konversi dijalankan dengan encoder sebenarnya; bukan hasil simulasi.
- WAV hasil unduh diperiksa header RIFF dan jumlah kanal mono.
- MP3, MP4, WebM, serta WAV hasil tiap mode diperiksa signature filenya.
- Filter, pembersihan antrean, pencatatan riwayat, tema gelap, dan navigasi mobile: lulus.
- Tidak ada error JavaScript tidak tertangani; tidak ada overflow halaman horizontal pada lebar 390 px.
- `npm run prepare:desktop`: lulus. Perbaikan Electron dan workflow pada patch sebelumnya tetap disertakan.

Untuk pengujian codec, aset @ffmpeg/core versi 0.12.6 yang sama dengan aplikasi disediakan secara lokal melalui route browser test agar tidak bergantung CDN; konversi benar-benar berjalan di WebAssembly. Pengujian ini bukan pengujian aplikasi Windows/installer final. Aplikasi produksi masih memerlukan koneksi saat pertama memuat core FFmpeg dari CDN untuk konversi selain WAV yang didukung browser.

Laporan browser ada di `review/browser-results.json`, preview terbaru di `review/desktop-release.png`, `review/mobile-release.png`, dan `review/dark-release.png`.

## Membuat EXE

Unggah isi folder proyek ke root repository, termasuk `.github`, `src`, `scripts`, `desktop`, package.json, dan package-lock.json. Commit, lalu buat run baru lewat Actions → Build Windows All-in-One Installer → Run workflow. Paket ini memakai versi 1.7.1, sehingga nama hasil menjadi `MediaForge-Studio-Setup-1.7.1-Windows-x64.exe` atau varian Portable.

Instruksi debugging sebelumnya ada di DEBUGGING_DAN_CARA_BUILD.md; catatan pemeriksaan 1.7.0 pada dokumen itu merupakan laporan patch build terdahulu.
