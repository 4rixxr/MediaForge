# Language settings — 1.7.2

Settings now includes Indonesian (default), English, Simplified Chinese/Mandarin, Thai, and Japanese. Selection applies immediately to Settings, sidebar, header navigation, and the main Converter workspace. Specialized tool screens and engine messages retain their existing source language where not yet translated.

Browser preference is stored locally. Electron also saves the language in its user-data folder, independently of the local server port. Invalid language codes are rejected. A delayed startup preference read cannot override a new selection.

Validation: TypeScript, production build, core/backend/desktop regression suite, and browser switching/reload checks for all five languages passed. Windows executable runtime validation still requires Windows.

Run the optional language browser check after npm run build with Playwright installed: node tests/language-smoke.cjs. MEDIAFORGE_CHROMIUM can specify a Chromium executable.
