/**
 * MediaForge - Real Client-Side Image Processing Engine
 * Powered by HTML5 Canvas & WebAPIs - 100% in-browser, privacy-first
 */

export interface ImageConversionOptions {
  format: 'jpeg' | 'png' | 'webp' | 'avif' | 'bmp' | 'ico';
  quality?: number; // 0 to 1
  width?: number;
  height?: number;
  keepAspectRatio?: boolean;
  backgroundColor?: string;
  rotate?: number; // 0, 90, 180, 270
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  stripMetadata?: boolean;
}

export async function loadImageFromFile(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image: file may be corrupted or unsupported format.'));
    };
    img.src = url;
  });
}

/**
 * Real client-side image conversion with resize, quality, background and transformations
 */
export async function convertImage(
  file: File | Blob,
  options: ImageConversionOptions
): Promise<{ blob: Blob; width: number; height: number; originalSize: number; newSize: number }> {
  const originalSize = file.size;

  for(const value of [options.width,options.height])if(value!==undefined&&(!Number.isInteger(value)||value<1||value>16384))throw Error('Ukuran gambar harus berupa piksel utuh antara 1–16384.');
  if (options.format === 'ico') {
    const icoBlob = await createIco(file, options.width || 64);
    return {
      blob: icoBlob,
      width: options.width || 64,
      height: options.width || 64,
      originalSize,
      newSize: icoBlob.size,
    };
  }

  const img = await loadImageFromFile(file);
  const srcWidth = img.naturalWidth;
  const srcHeight = img.naturalHeight;

  let targetWidth = options.width || srcWidth;
  let targetHeight = options.height || srcHeight;

  if (options.keepAspectRatio && options.width && !options.height) {
    targetHeight = Math.round((srcHeight / srcWidth) * options.width);
  } else if (options.keepAspectRatio && options.height && !options.width) {
    targetWidth = Math.round((srcWidth / srcHeight) * options.height);
  } else if (options.keepAspectRatio && options.width && options.height) {
    const ratio = Math.min(options.width / srcWidth, options.height / srcHeight);
    targetWidth = Math.round(srcWidth * ratio);
    targetHeight = Math.round(srcHeight * ratio);
  }

  targetWidth = Math.max(1, targetWidth);
  targetHeight = Math.max(1, targetHeight);

  const canvas = document.createElement('canvas');
  const rotateAngle = (((options.rotate || 0) % 360) + 360) % 360;
  const isRotated90or270 = rotateAngle === 90 || rotateAngle === 270;

  canvas.width = isRotated90or270 ? targetHeight : targetWidth;
  canvas.height = isRotated90or270 ? targetWidth : targetHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Fill background if specified or if converting to JPEG without alpha
  if (options.format === 'jpeg' || options.format === 'bmp' || options.backgroundColor) {
    ctx.fillStyle = options.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Apply transformations: rotation and flips
  ctx.translate(canvas.width / 2, canvas.height / 2);
  if (rotateAngle !== 0) {
    ctx.rotate((rotateAngle * Math.PI) / 180);
  }
  ctx.scale(options.flipHorizontal ? -1 : 1, options.flipVertical ? -1 : 1);

  ctx.drawImage(
    img,
    -targetWidth / 2,
    -targetHeight / 2,
    targetWidth,
    targetHeight
  );
  ctx.restore();

  // Export to requested mime type
  const mimeType =
    options.format === 'jpeg'
      ? 'image/jpeg'
      : options.format === 'png'
      ? 'image/png'
      : options.format === 'webp'
      ? 'image/webp'
      : options.format === 'avif'
      ? 'image/avif'
      : options.format === 'bmp'
      ? 'image/bmp'
      : 'image/png';

  const quality = typeof options.quality === 'number' ? options.quality : 0.92;

  const blob = options.format==='bmp'?encodeBmp(ctx.getImageData(0,0,canvas.width,canvas.height)):await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b && b.type === mimeType) resolve(b);
        else if (b) reject(new Error(`This browser cannot encode ${options.format.toUpperCase()}. Choose PNG, JPEG, or WebP.`));
        else reject(new Error(`Failed to convert image to ${options.format}. Browser might not support direct encoding.`));
      },
      mimeType,
      quality
    );
  });

  return {
    blob,
    width: canvas.width,
    height: canvas.height,
    originalSize,
    newSize: blob.size,
  };
}

// Uncompressed Windows BMP: bottom-up BGR rows aligned to four bytes.
export function encodeBmp(image:ImageData):Blob {
 const {width,height,data}=image,stride=Math.ceil(width*3/4)*4;
 const bytes=new Uint8Array(54+stride*height),view=new DataView(bytes.buffer);
 bytes[0]=0x42;bytes[1]=0x4d;view.setUint32(2,bytes.length,true);view.setUint32(10,54,true);
 view.setUint32(14,40,true);view.setInt32(18,width,true);view.setInt32(22,height,true);
 view.setUint16(26,1,true);view.setUint16(28,24,true);view.setUint32(34,stride*height,true);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const src=(y*width+x)*4,dst=54+(height-1-y)*stride+x*3;bytes[dst]=data[src+2];bytes[dst+1]=data[src+1];bytes[dst+2]=data[src];}
 return new Blob([bytes],{type:'image/bmp'});
}

/**
 * Real client-side image cropper
 */
export async function cropImage(
  file: File | Blob,
  cropArea: { x: number; y: number; width: number; height: number },
  format: 'jpeg' | 'png' | 'webp' = 'png',
  quality: number = 0.92
): Promise<Blob> {
  const img = await loadImageFromFile(file);
  if((['x','y','width','height'] as const).some(k=>!Number.isFinite(cropArea[k]))||cropArea.x<0||cropArea.y<0||cropArea.width<1||cropArea.height<1||cropArea.x+cropArea.width>img.naturalWidth||cropArea.y+cropArea.height>img.naturalHeight)throw Error('Area crop melewati ukuran gambar.');
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(cropArea.width));
  canvas.height = Math.max(1, Math.round(cropArea.height));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    img,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Cropping failed'))), mime, quality);
  });
}

/**
 * Real ICO Generator (creates valid Windows .ico binary with embedded PNG/BMP icon)
 */
export async function createIco(file: File | Blob, size: number = 64): Promise<Blob> {
  if (!Number.isInteger(size) || size < 1 || size > 256) throw new Error('ICO size must be between 1 and 256 pixels.');
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, size, size);

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to generate PNG frame for ICO'))), 'image/png');
  });

  const pngArrayBuffer = await pngBlob.arrayBuffer();
  const pngBytes = new Uint8Array(pngArrayBuffer);

  // ICO header is 6 bytes + 1 directory entry (16 bytes) = 22 bytes header
  const icoHeader = new Uint8Array(6 + 16);
  const view = new DataView(icoHeader.buffer);

  // Reserved (0)
  view.setUint16(0, 0, true);
  // Type 1 = ICO
  view.setUint16(2, 1, true);
  // Number of images = 1
  view.setUint16(4, 1, true);

  // Directory entry 1
  icoHeader[6] = size >= 256 ? 0 : size; // Width (0 means 256)
  icoHeader[7] = size >= 256 ? 0 : size; // Height
  icoHeader[8] = 0; // Colors (0 = no palette)
  icoHeader[9] = 0; // Reserved
  view.setUint16(10, 1, true); // Color planes
  view.setUint16(12, 32, true); // Bits per pixel
  view.setUint32(14, pngBytes.length, true); // Image data size in bytes
  view.setUint32(18, 22, true); // Offset to image data (22)

  const combined = new Uint8Array(icoHeader.length + pngBytes.length);
  combined.set(icoHeader, 0);
  combined.set(pngBytes, icoHeader.length);

  return new Blob([combined], { type: 'image/x-icon' });
}
