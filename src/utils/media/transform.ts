/**
 * Pure browser-only image transforms shared between SDK preprocess and any
 * other surface that needs to reshape a File before upload.
 *
 * Lives at the `utils/media/` layer so nothing here reaches into `chrome/`.
 */

/** Convert AVIF file to JPEG (some CDNs, incl. Cloudflare Images, 415 AVIFs). */
export function convertAvifToJpeg(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx?.drawImage(img, 0, 0);

      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(
              new File([blob], file.name.replace(/\.avif$/i, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
            );
          } else {
            reject(new Error("Failed to convert AVIF to JPEG"));
          }
        },
        "image/jpeg",
        0.92
      );
    };

    img.onerror = () => reject(new Error("Failed to load AVIF image"));
    img.src = URL.createObjectURL(file);
  });
}

/** Resize image client-side if wider than maxWidth, preserving aspect ratio. */
export function resizeImageIfNeeded(file: File, maxWidth: number = 2680): Promise<File> {
  return new Promise(resolve => {
    const img = document.createElement("img");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      if (img.width <= maxWidth) {
        resolve(file);
        return;
      }

      const aspectRatio = img.height / img.width;
      const newWidth = maxWidth;
      const newHeight = Math.round(newWidth * aspectRatio);

      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx?.drawImage(img, 0, 0, newWidth, newHeight);

      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(
              new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              })
            );
          } else {
            resolve(file);
          }
        },
        file.type,
        0.9
      );
    };

    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}
