# MediaForge Studio 1.8.4

Paket source perbaikan konversi dan build Windows. **ZIP ini bukan installer EXE.**

Baca [MULAI_DI_SINI.md](MULAI_DI_SINI.md) untuk membuat installer/portable baru. Rincian perubahan dan bukti pengujian ada di [WINDOWS_CHECKOUT_1.8.4.md](WINDOWS_CHECKOUT_1.8.4.md).

## Menjalankan preview

Node.js 22.12+:

```sh
npm ci
npm run dev
```

Build preview produksi:

```sh
npm run build
npm start
```

Buka `http://127.0.0.1:8787`. Jangan membuka `dist/index.html` langsung melalui `file://`.

Engine browser disalin dari dependensi terkunci ke `public/ffmpeg` oleh `prebuild`/`predev`, kemudian masuk ke `dist`. Konversi file tidak lagi mengambil engine dari CDN. Aplikasi Electron menggunakan FFmpeg/FFprobe native yang disertakan dalam paket Windows. Unduh dari URL tetap membutuhkan internet; preview browser memerlukan backend lokal untuk fitur tersebut.

## Format dan alat

- Audio: MP3, WAV, AAC, M4A, FLAC, OGG Vorbis (Q −1…10), Opus, WMA v2. WAV/FLAC tidak memakai kontrol bitrate lossy.
- Video: MP4, WebM, MKV, MOV, AVI, TS, GIF, MPEG-1, MPEG-2 program stream, DAT berisi stream VCD PAL.
- Crop, resize, trim, ekstrak audio/frame, gabung/potong audio, visualizer audio-ke-video.
- Gambar: JPEG/PNG/WebP/BMP/ICO; AVIF hanya ditawarkan bila encoder browser tersedia. PDF dibuat dari gambar, bukan editor umum PDF.
- Bahasa menu: Indonesia, Inggris, Mandarin, Thailand, Jepang.
- Burner Windows: VCD 2.0, Audio CD, CD data, DVD data. Rincian format image dan keterbatasan ada pada catatan versi.

## Verifikasi

```sh
npm run lint
npm test
npm run prepare:desktop
```

Tes yang memakai encoder native:

```sh
MEDIAFORGE_NATIVE_TEST=1 npm test
node tests/bitrate-matrix.cjs
```

Pada PowerShell, gunakan `$env:MEDIAFORGE_NATIVE_TEST='1'` sebelum `npm test`. FFmpeg/FFprobe harus tersedia di PATH atau melalui `MEDIAFORGE_FFMPEG`/`MEDIAFORGE_FFPROBE`. Untuk menguji image VCD, isi `MEDIAFORGE_VCDIMAGER` dengan path executable.

Tes browser QA membutuhkan Playwright dan Chromium (tidak disertakan sebagai dependensi produksi): `tests/browser-smoke.cjs`, `tests/media-browser-smoke.cjs`, `tests/tool-browser-regressions.cjs`, `tests/language-smoke.cjs`. `MEDIAFORGE_CHROMIUM` dapat menunjuk browser yang sudah terpasang. Jalankan `npm run build` dahulu; tes alat juga menjalankan Vite lokal. Jalankan tes yang memakai port sama secara berurutan.

## Batas implementasi

Pemrosesan browser dan transfer IPC memakai memori; tidak ada klaim ukuran berkas tanpa batas. Membatalkan antrean menolak hasil, tetapi belum menghentikan proses encoder aktif. Web Opus menggunakan WebCodecs dan Ogg muxer untuk menghindari bug libopus dalam distribusi FFmpeg.wasm; browser tanpa AudioEncoder akan menampilkan pesan yang jelas. Desktop memakai libopus native.

Build Windows, COM/IMAPI, burner fisik, dan unduhan situs nyata harus diverifikasi pada Windows. Pemeriksaan lokal yang lulus bukan bukti semua kombinasi perangkat dan file bebas bug. Detail batas validasi dicatat pada catatan versi. Dokumen versi 1.7.x dan sebelumnya adalah arsip riwayat; gunakan panduan 1.8.4 ini untuk build terbaru.
