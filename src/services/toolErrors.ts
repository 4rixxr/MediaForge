export function reportToolError(error: unknown) {
 const message=error instanceof Error?error.message:String(error||'Proses gagal. Pilih berkas lain dan coba lagi.');
 window.dispatchEvent(new CustomEvent('mediaforge:tool-error',{detail:message}));
}
