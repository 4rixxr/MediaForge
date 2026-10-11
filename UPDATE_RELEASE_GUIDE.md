# MediaForge Smart Auto Update — Release guide

## Status
- Desktop checks for updates on startup, shows an update banner, and requires consent before download/install.
- Website remains independent; update controls are disabled there.
- Windows NSIS is used; portable builds do not auto-update.
- **Do not claim updates work until a published public release is tested on Windows.**

## Public release repository
Create a **public** GitHub repository `4rixxr/MediaForge-Releases` containing **release assets only**. Keep the source repo private. The electron-builder publish configuration points to this repository.

## Build and publish
1. Install/build dependencies using the Windows Actions workflow. It outputs installer `.exe`, `latest.yml`, and `.blockmap` files.
2. Create a GitHub **Release** in `4rixxr/MediaForge-Releases` tagged `v1.7.0` and attach all three output types from the same build. Do not change filenames.
3. For the next update, increment package version to `1.7.1` or higher, build, and publish a newer release with its matching files.
4. Install v1.7.0, launch while online, and verify detection of the newer release; test download and restart/install with user consent.
5. Use code signing for public distribution where feasible. Do not embed private GitHub tokens in app builds.

## Security and compatibility
- Release repository must be public; updater must never use credentials embedded in the application.
- GitHub Actions artifact alone is NOT a release. The workflow intentionally does not publish without credentials.
- The existing appId and NSIS target must remain stable across versions.
- Existing installed v1.6.0 builds lack update logic; users must manually install v1.7.0 once.
- FFmpeg/yt-dlp need independent runtime smoke tests after Windows packaging.
