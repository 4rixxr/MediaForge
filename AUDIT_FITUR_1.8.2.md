# Audit fitur MediaForge Studio 1.8.2

Tanggal: 13 Oktober 2026. Paket ini memuat source dan build web, **bukan installer EXE Windows**. Melanjutkan perbaikan 1.8.0 dan 1.8.1; tidak menghapus profil media atau fitur burner yang telah dibuat.

## Bug yang diperbaiki

1. Menu Batch Converter membuka dashboard, sehingga kontrol batch sebenarnya tidak dapat dijangkau. Sekarang membuka Batch Converter.
2. File `.aif` dan `.wmv` tanpa MIME salah dikategorikan atau ditolak. Pengenalan ekstensi kini dipakai bersama oleh workspace dan antrean.
3. Video Resizer: preset mengabaikan Maintain original aspect ratio. Preset kini memasukkan video ke batas resolusi sambil mempertahankan rasio bila opsi aktif; pembulatan ke piksel genap diperlukan encoder.
4. Video Converter: perubahan pengaturan tidak membatalkan hasil lama. Hasil kini dihapus saat pengaturan berubah; kontrol terkunci selama konversi, termasuk Convert All.
5. Audio Compressor: preset baru masih menampilkan hasil lama dan kontrol dapat diubah ketika proses berjalan. Invalidasi hasil dan penguncian kontrol ditambahkan.
6. Batch menawarkan AVIF walaupun browser tidak memiliki encoder. Pilihan kini mengikuti kemampuan browser; BMP juga tersedia di batch.
7. Download All as ZIP untuk satu berkas justru mengunduh media mentah. Sekarang selalu menghasilkan ZIP; tombol Download per berkas tetap tersedia.
8. URL objek unduhan sementara tidak dilepas pada banyak alat. Kini dilepas setelah tenggang 60 detik; preview Video Converter, frame video, dan daftar gambar PDF dilepas saat dihapus atau halaman ditutup.
9. Fungsi ekspor PDF `cover` meregangkan gambar. Kini mempertahankan rasio dan memotong ke area dalam margin. Margin yang meniadakan area halaman ditolak dengan pesan jelas. UI Image to PDF tetap menggunakan contain seperti sebelumnya; tidak menambahkan menu palsu.
10. WAV jalur lokal melewati validasi opsi. Kini sample rate/channel/volume divalidasi sebelum pemrosesan, termasuk mempertahankan dukungan 24 kHz yang diuji sebelumnya.
11. Inspector desktop mencoba menjalankan FFprobe pada dokumen non-media. Kini informasi dasar dokumen tetap dapat ditampilkan.
12. Tombol skala Image Resizer setelah file dimuat dapat meluber pada ponsel. Tombol kini membungkus ke baris berikutnya.
13. Pengemasan Node sebelumnya mengasumsikan URL LICENSE pada server dist. Kini menyalin LICENSE dari distribusi Node Windows yang sama dengan executable; build berhenti dengan pesan jelas jika lisensi hilang. Pemeriksa paket juga mewajibkan lisensinya.

## Hasil verifikasi

- TypeScript: lulus.
- Build produksi dan staging dependensi runtime: lulus.
- Pemeriksaan ASAR staging, termasuk electron-updater dan engine WASM: lulus. Ini bukan peluncuran EXE Windows.
- `npm test` dengan pengujian native aktif: **22 tes, 22 lulus, 0 dilewati**; tambahan assertion inti WAV, pengenalan ekstensi, serialisasi worker, dan cleanup juga lulus.
- Matrix FFmpeg native: **362 konfigurasi bitrate/quality × sample rate × kanal lossy**, tanpa kegagalan encoder.
- Audit Chromium: **28 rute alat**, tata letak awal desktop/390 px, tanpa error JavaScript tak tertangani.
- Tes browser produksi: empat mode konversi, OGG/Vorbis, Opus, WMA, FLAC, M4A, MPEG, MPEG-2 dan DAT lulus. Keluaran diperiksa dengan signature/FFprobe sesuai tes, bukan sekadar nama ekstensi.
- Bahasa Indonesia, Inggris, Mandarin, Thailand dan Jepang: perubahan pengaturan serta persistensi sesudah reload lulus. Ini tidak mengklaim seluruh teks alat sudah diterjemahkan.

## Cakupan per fitur

Setiap baris mendapat pemeriksaan rute dan layout awal. Pengujian proses yang benar-benar dilakukan dijelaskan terpisah; tidak semua kombinasi input/pengaturan diuji lewat klik UI.

| Fitur | Pengujian pemrosesan tambahan |
|---|---|
| Burner | Image Audio CD dan VCD dengan encoder/authoring asli; validasi sektor, format dan kapasitas. Browser menonaktifkan operasi hardware. Penulisan fisik dan IMAPI Windows belum diuji di sini. |
| URL Downloader | UI analisis → konfirmasi → file MP4, HTTP + FFmpeg asli, 8 format, trim, batas resolusi, video tanpa suara, penolakan HTML. Pengambilan internet diganti fixture lokal. |
| Video Converter | Output H.264 asli, kontrol terkunci, invalidasi hasil sesudah ganti format. |
| Video Compressor | Audit konfigurasi bitrate/resolusi dan jalur FFmpeg bersama; tidak menjalankan semua preset lewat UI. |
| Video Resizer | Preset 720p untuk input 4:3: 960×720 saat rasio aktif; 1280×720 saat nonaktif. Output resize fungsi bersama diperiksa. |
| Video Cropper | Output crop 160×120 diperiksa FFprobe. |
| Video Trimmer | Output potongan 1 detik diperiksa. |
| Video to GIF | File GIF89a dan jumlah frame; tombol UI; invalidasi hasil. |
| Video to Image | Frame PNG dan ZIP dari video asli. |
| Extract Audio | Mode Video → Audio menghasilkan WAV dengan signature valid. |
| Audio Converter | Matrix bitrate native, output browser, metadata Opus, sample rate dan kanal. |
| Audio Compressor | Konversi aktual, pergantian preset menghapus hasil lama. |
| Audio Cutter | Potongan WAV dan durasi diperiksa. |
| Audio Merger | Dua trek menjadi WAV dengan durasi gabungan. |
| Audio to Video | Visualizer menghasilkan MP4/H.264 dengan audio; durasi diperiksa. |
| Image Converter | PNG/JPEG/WebP/BMP/ICO nyata, dimensi dengan FFprobe; encoder AVIF tidak dipalsukan. |
| Image Compressor | Jalur encoder gambar diuji; seluruh preset kompresi UI belum diuji. |
| Image Resizer | Jalur resize gambar dan layout sesudah upload pada 390 px. |
| Image Cropper | Crop asli 20×30, area valid. |
| Image to PDF | Dua halaman, rotasi, signature PDF; rasio cover dan clipping di fungsi; validasi margin. |
| Image to ICO | Biner ICO dibaca FFprobe, ukuran cocok. |
| Image to WebP | Output WebP dibaca FFprobe, ukuran cocok. |
| PDF Tools | Rute tersedia, inspeksi dasar dan fungsi Images to PDF; tidak mengklaim edit isi PDF. |
| Audio / Video Converter | Empat mode workspace, file contoh, unduh hasil, filter antrean, riwayat. |
| Batch Converter | Kategori MIME kosong, konversi, ZIP satu berkas, pilihan encoder, rute benar. |
| Media Information | Metadata WAV 44,1 kHz/stereo dan informasi dasar dokumen. |
| History | Hasil konversi masuk riwayat; membersihkan antrean tidak menghapus riwayat. |
| Settings | Lima bahasa dan reload; tema gelap/terang; navigasi ponsel. |

## Batas penting

- Tidak ada klaim bebas seluruh bug. Fixture pendek tidak mewakili semua codec, file rusak, video panjang, atau perangkat.
- **GitHub Actions/EXE Windows, IMAPI ISO data CD/DVD, drive CD/DVD fisik, serta unduhan situs nyata belum dijalankan di lingkungan Linux ini.** Workflow menyediakan pemeriksaan Windows, tetapi keberhasilannya harus dibuktikan oleh run baru dari commit paket ini.
- VCD memakai BIN/CUE; Audio CD memakai CUE/WAV. ISO hanya untuk data CD/DVD. DVD data bukan DVD-Video. Tidak ada pembakaran fisik otomatis dalam tes.
- Antrean batal menolak hasil tetapi belum menghentikan encoder aktif; operasi native/WASM memakai memori, tanpa janji file berukuran tak terbatas.
- Unduhan URL masih tergantung akses sumber, perubahan situs dan batas proses; tidak ada bypass DRM atau jaminan semua tautan bisa diunduh.

## Bukti dan cara menjalankan ulang

Log audit terbaru ada di `review/*1.8.2.log`. Skrip tes browser memakai Playwright dan Chromium sebagai alat QA terpisah, bukan dependensi aplikasi produksi.

Tes: `tests/feature-audit.cjs`, `tests/tool-browser-regressions.cjs`, `tests/browser-smoke.cjs`, `tests/media-browser-smoke.cjs`, `tests/language-smoke.cjs`, `tests/url-browser-smoke.cjs`, serta `npm test` dan `tests/bitrate-matrix.cjs`.

Build Windows: ikuti `MULAI_DI_SINI.md`; commit semua isi paket termasuk `.github`, kemudian jalankan workflow baru. Mengulang run lama tetap memakai source commit lama.
