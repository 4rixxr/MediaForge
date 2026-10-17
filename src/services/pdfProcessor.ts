/**
 * MediaForge - Real Client-Side Image to PDF Processing Engine
 * Powered by jsPDF - 100% in-browser, privacy-first
 */

import { jsPDF } from 'jspdf';
import { loadImageFromFile } from './imageProcessor';

export interface ImageToPdfItem {
  id: string;
  file: File;
  previewUrl: string;
  rotation: number; // 0, 90, 180, 270
}

export interface PdfExportOptions {
  pageSize: 'a4' | 'a5' | 'letter' | 'legal' | 'original';
  orientation: 'p' | 'l' | 'auto'; // portrait, landscape, or auto based on image aspect
  marginMm: number; // 0, 5, 10, 15
  imageFit: 'contain' | 'cover';
}

const PAGE_DIMENSIONS_MM: Record<string, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  a5: { width: 148, height: 210 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 },
};

export async function convertImagesToPdf(
  items: ImageToPdfItem[],
  options: PdfExportOptions,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  if (items.length === 0) {
    throw new Error('Please add at least one image to convert to PDF.');
  }

  if(!Number.isFinite(options.marginMm)||options.marginMm<0)throw Error('Margin PDF tidak valid.');

  // Initialize jsPDF
  let doc: jsPDF | null = null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const img = await loadImageFromFile(item.file);

    // Apply rotation on canvas if needed
    let canvas = document.createElement('canvas');
    const isRotated90 = item.rotation === 90 || item.rotation === 270;
    canvas.width = isRotated90 ? img.naturalHeight : img.naturalWidth;
    canvas.height = isRotated90 ? img.naturalWidth : img.naturalHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((item.rotation * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    const imgDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Determine page width and height
    let pageWidthMm = 210;
    let pageHeightMm = 297;
    let orientation: 'p' | 'l' = 'p';

    if (options.pageSize === 'original') {
      // 1 px approx 0.264583 mm at 96 DPI
      pageWidthMm = imgWidth * 0.264583;
      pageHeightMm = imgHeight * 0.264583;
      orientation = pageWidthMm > pageHeightMm ? 'l' : 'p';
    } else {
      const standard = PAGE_DIMENSIONS_MM[options.pageSize] || PAGE_DIMENSIONS_MM.a4;
      if (options.orientation === 'auto') {
        orientation = imgWidth > imgHeight ? 'l' : 'p';
      } else {
        orientation = options.orientation;
      }
      pageWidthMm = orientation === 'l' ? standard.height : standard.width;
      pageHeightMm = orientation === 'l' ? standard.width : standard.height;
    }

    if (i === 0) {
      doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: options.pageSize === 'original' ? [pageWidthMm, pageHeightMm] : options.pageSize,
      });
    } else {
      doc!.addPage(
        options.pageSize === 'original' ? [pageWidthMm, pageHeightMm] : options.pageSize,
        orientation
      );
    }

    // Calculate dimensions with margin
    const margin = options.marginMm;
    const availableWidth = pageWidthMm - margin * 2;
    const availableHeight = pageHeightMm - margin * 2;
    if(availableWidth<=0||availableHeight<=0)throw Error('Margin terlalu besar untuk ukuran halaman. Kurangi margin atau pilih A4.');

    let finalRenderWidth = availableWidth;
    let finalRenderHeight = availableHeight;
    let offsetX = margin;
    let offsetY = margin;

    const imgAspect = imgWidth / imgHeight;
    const pageAspect = availableWidth / availableHeight;

    if (options.imageFit === 'contain') {
      if (imgAspect > pageAspect) {
        finalRenderWidth = availableWidth;
        finalRenderHeight = availableWidth / imgAspect;
        offsetY = margin + (availableHeight - finalRenderHeight) / 2;
      } else {
        finalRenderHeight = availableHeight;
        finalRenderWidth = availableHeight * imgAspect;
        offsetX = margin + (availableWidth - finalRenderWidth) / 2;
      }
    }

    if(options.imageFit==='cover'){
      const scale=Math.max(availableWidth/imgWidth,availableHeight/imgHeight);
      finalRenderWidth=imgWidth*scale;finalRenderHeight=imgHeight*scale;
      offsetX=margin+(availableWidth-finalRenderWidth)/2;offsetY=margin+(availableHeight-finalRenderHeight)/2;
    }
    doc!.saveGraphicsState();
    doc!.rect(margin,margin,availableWidth,availableHeight);doc!.clip();doc!.discardPath();
    doc!.addImage(imgDataUrl, 'JPEG', offsetX, offsetY, finalRenderWidth, finalRenderHeight, undefined, 'FAST');
    doc!.restoreGraphicsState();

    if (onProgress) {
      onProgress(Math.round(((i + 1) / items.length) * 100));
    }
  }

  const outputBlob = doc!.output('blob');
  return outputBlob;
}
