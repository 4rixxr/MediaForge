# MediaForge Studio 1.8.0 — perbaikan dan hasil pengujian

Tanggal pengujian akhir: 13 Oktober 2026. Source beserta preview produksi; bukan EXE Windows final.

## Penyebab kegagalan yang ditemukan dan diperbaiki

| Temuan | Perubahan |
|---|---|
| Engine browser diambil dari CDN saat konversi | FFmpeg core 0.12.10 dikunci dan dikemas di `dist/ffmpeg`. Tidak perlu mengambil engine dari situs lain saat digunakan. |
| Electron tetap bergantung pada engine WASM meskipun membawa FFmpeg native | Tambah service desktop dan preload IPC; konversi desktop memakai FFmpeg/FFprobe bawaan. Validasi input, error encoder, progress, antrean, dan cleanup berada pada jalur yang sama. |
| Opus 48 kHz menyebabkan error memori pada FFmpeg.wasm yang didistribusikan | Web Opus memakai WebCodecs AudioEncoder dan muxer Ogg dari Mediabunny; desktop tetap libopus native. Tidak mengubah sample rate diam-diam untuk menyembunyikan error. WebM memakai VP8/Vorbis. |
| Crop video melewati FFmpeg | Semua proses video menggunakan builder argumen bersama; crop, resize, trim, mute, FPS dan bitrate diterapkan. |
| Video-to-GIF menghasilkan MP4 dengan ekstensi GIF | Komponen sekarang meminta codec/container GIF dan menampilkan preview gambar animasi, bukan elemen video. |
| Visualizer dapat menghasilkan WebM dengan nama MP4 | Rekaman visualizer ditranscode menjadi MP4/H.264 sebelum diberikan sebagai hasil. |
| Pemilihan codec HEVC/AV1 tidak diterapkan | Kontrol yang tidak berfungsi dihapus; UI menampilkan profil encoder yang benar-benar digunakan. |
| Hasil lama masih bisa diunduh setelah pengaturan berubah | Hasil dibatalkan saat file/pengaturan berubah; kontrol dikunci selama proses. |
| Beberapa kegagalan hanya masuk console | Error proses dan pemuatan file ditampilkan ke pengguna. |
| OGG diperlakukan seperti bitrate MP3 | OGG Vorbis menggunakan Q −1…10; Opus menggunakan preset bitrate tersendiri serta batas kanal. AAC divalidasi menurut sample rate/kanal. WMA menggunakan wmav2/ASF. |
| Informasi codec ditebak dari ekstensi, sample rate terbaca setelah resampling | Desktop membaca FFprobe; browser membaca track media melalui parser. Data yang tidak tersedia tidak ditebak. |
| BMP bergantung pada encoder Canvas yang tidak tersedia | Encoder BMP 24-bit dibuat dengan header dan padding baris yang benar. AVIF hanya ditawarkan bila encoder Canvas tersedia. ICO default 64, maksimum 256. |
| Kompresor menampilkan penghematan fiktif berupa persentase tetap | Ukuran hasil dibaca dari Blob; perkiraan video memakai durasi dan target bitrate, tanpa janji selalu lebih kecil. Rasio sumber dipertahankan. |
| Berkas WMA/MPEG tidak dikenali beberapa pemilih file | Tambah ekstensi audio/video eksplisit. Decode audio dan preview video dapat melalui FFmpeg ketika browser tidak mendukung kontainernya. |
| Verifier ASAR mencari path slash Unix pada Windows | Path extraction dinormalisasi dengan separator host; tes menggunakan implementasi ASAR terpasang dengan semantik `path.win32`. |
| Runtime/staging kehilangan file baru | `shared`, media service, burner, preload, updater, core JS/WASM diperiksa sebelum/ sesudah packaging. Build installer dan portable memakai staging yang sama. |

Menu Audio/Video Converter berada pada alat media. Chip Apple Music/Tidal/Deezer DRM dihapus dari halaman downloader; YouTube, Bstation/Bilibili, Dailymotion diberi label Supported. Ini tidak menjamin semua URL tersedia: downloader tetap bergantung pada yt-dlp, akses sumber, dan jaringan. Bahasa id/en/zh/th/ja beserta persistensinya dipertahankan.

## Konfigurasi Burner

| Mode | Isi dan format image | Penulisan Windows |
|---|---|---|
| Audio CD | PCM 44.1 kHz, 16-bit, stereo; minimum 4 detik/trek, sektor 2352 byte, jeda 2 detik; CUE + WAV | IMAPI2 TrackAtOnce, pemeriksaan CD kosong dan kapasitas, finalisasi |
| VCD | VCD 2.0 melalui VCDImager; MPEG-1/MP2, profil PAL atau NTSC, tampilan 4:3 dengan letterbox, sektor Mode 2 XA; BIN + CUE | CDRDAO hanya pada recorder hasil deteksi, pemeriksaan CD kosong/kapasitas sebelum dan sesudah konfirmasi |
| CD data | ISO9660 + Joliet, sektor 2048 byte; ISO | IMAPI2 DataWriter |
| DVD data | UDF 1.02, kapasitas single-layer; ISO | IMAPI2 DataWriter |

**DVD ini adalah DVD data, bukan authoring DVD-Video untuk DVD player.** Audio CD dan VCD memerlukan struktur track yang tidak terwakili dengan benar oleh ISO data biasa; aplikasi menawarkan CUE/WAV atau BIN/CUE yang sebenarnya. Tidak ada file yang hanya diganti ekstensi menjadi ISO. Ekspor DAT pada konverter adalah stream MPEG VCD, bukan image cakram lengkap.

Tidak ada drive: pengguna tetap bisa menyimpan image. Ada drive: pengguna tetap boleh memilih image tanpa membakar. Image disiapkan sebelum penulisan fisik. Aplikasi memeriksa recorder dan media, meminta konfirmasi native sebelum penulisan, menolak media berisi data, dan mencegah penutupan aplikasi selama operasi burner. Aplikasi tidak melakukan penghapusan/overburn. Browser preview tidak diberi kemampuan menulis drive palsu.

VCDImager dan DLL dikemas dari MSYS2 UCRT64; CDRDAO 1.2.6 diunduh dari rilis resmi dengan verifikasi SHA-256. Script Windows memeriksa binary dan image sebelum packaging.

## Bukti yang sudah dijalankan

- `npm run lint`: lulus.
- Build Vite produksi, staging minimal, `npm ci` dependensi runtime, dan verifier staging: lulus.
- ASAR nyata dibuat dari staging terbaru dan dibaca kembali menggunakan `@electron/asar`: seluruh berkas runtime wajib ditemukan.
- Suite inti serta **19 tes Node: 19 lulus, 0 gagal, 0 dilewati** saat native/VCDImager diaktifkan. Termasuk jalur native konversi/FFprobe, penolakan input invalid, Audio CD, VCD PAL/NTSC, HTTP downloader dan Windows ASAR path.
- **362 kombinasi** preset lossy, sample rate dan kanal berhasil dienkode oleh FFmpeg native; lihat `review/bitrate-matrix.log`. Ini menguji penerimaan konfigurasi, bukan klaim bitrate VBR terukur selalu persis target.
- UI produksi browser menghasilkan OGG/Vorbis, Opus, WMA, FLAC, M4A, MPEG-1, MPEG-2, DAT; file unduhan diperiksa dengan FFprobe. Jalur native dari UI diuji lagi menggunakan service desktop aktual dengan transport IPC digantikan transport pengujian.
- Empat mode konversi UI diuji: audio→audio MP3/WAV, audio→video MP4, video→video WebM, video→audio WAV. Header/container file unduhan diperiksa.
- Crop 160×120, resize 240×180, trim berdurasi 1 detik, GIF animasi 20 frame, frame PNG/ZIP, potong/gabung audio, BMP/PNG/JPEG/WebP/ICO, visualizer MP4 dengan audio: hasil nyata diverifikasi di browser dan jalur native.
- Opus browser diuji pula pada 6 kbps/mono/input 8 kHz dan 510 kbps/stereo/input 48 kHz, termasuk metadata judul.
- Komponen Video-to-GIF menghasilkan signature GIF89a; perubahan waktu menghapus tombol unduh hasil lama. Metadata WAV mempertahankan informasi sample rate sumber 44.1 kHz; PDF dua halaman dengan rotasi dibuat dan jumlah halaman diperiksa.
- Bahasa Inggris/Mandarin/Thailand/Jepang/Indonesia dan persistensi setelah reload: lulus.
- Layout desktop/dark/mobile, filter antrean dan riwayat: lulus tanpa error JavaScript; mobile tidak overflow horizontal.
- Ketiga workflow diparse sebagai YAML tanpa error.

Log terpilih tersedia dalam `review/`. Tes browser memakai Chromium headless 133 pada Linux; compiler/runtime dari lockfile proyek. Tes memakai fixture pendek yang dibuat khusus, bukan seluruh koleksi file pengguna.

## Yang belum terbukti di lingkungan ini

- Belum menjalankan GitHub Actions pada repository pengguna atau menghasilkan/membuka installer NSIS/portable final di Windows.
- IMAPI/COM, deteksi drive Windows, pembuatan ISO melalui IMAPI, dan pembakaran/hasil baca fisik CD/DVD belum diuji pada perangkat Windows. Workflow menyertakan tes ISO tanpa drive serta smoke test Electron, tetapi hasilnya harus ditinjau dari run baru.
- Smoke test Windows sekarang membuka BrowserWindow tersembunyi dan menguji preload/IPC → FFmpeg → Opus, selain memeriksa updater. Ini adalah gate yang ditambahkan, bukan hasil Windows yang sudah dinyatakan lulus.
- Tes HTTP downloader memakai runner yt-dlp/FFmpeg simulasi; belum mengunduh URL situs nyata. Tes encoder lokal menggunakan FFmpeg asli.
- Bukan jaminan bebas seluruh bug atau dukungan seluruh codec/perangkat. File besar memakai memori browser/IPC; pembatalan antrean belum menghentikan encoder aktif.

## Rujukan implementasi

- FFmpeg codec dan format: https://ffmpeg.org/ffmpeg-codecs.html dan https://ffmpeg.org/ffmpeg-formats.html
- Bug Opus pada distribusi WASM: https://github.com/ffmpegwasm/ffmpeg.wasm/issues/867
- Mediabunny audio sources/Ogg: https://mediabunny.dev/guide/media-sources dan https://mediabunny.dev/guide/output-formats
- IMAPI: https://learn.microsoft.com/en-us/windows/win32/imapi/imapi-interfaces
- VCDImager: https://www.gnu.org/software/vcdimager/
- CDRDAO: https://github.com/cdrdao/cdrdao

Panduan penerapan terbaru: [MULAI_DI_SINI.md](MULAI_DI_SINI.md). Dokumen versi lama hanya menjadi riwayat, bukan instruksi build 1.8.0.
