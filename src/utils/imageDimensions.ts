/**
 * Utility functions for extracting and handling image dimensions
 */

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Extract image dimensions from a File object
 * @param file - The image file
 * @returns Promise<ImageDimensions> - The image dimensions
 */
export const getImageDimensionsFromFile = (file: File): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const dimensions: ImageDimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
      };
      resolve(dimensions);
    };

    img.onerror = () => {
      reject(new Error("Failed to load image for dimension extraction"));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Extract image dimensions from a URL
 * @param url - The image URL
 * @returns Promise<ImageDimensions> - The image dimensions
 */
export const getImageDimensionsFromUrl = (url: string): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const dimensions: ImageDimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
      };
      resolve(dimensions);
    };

    img.onerror = () => {
      reject(new Error("Failed to load image from URL for dimension extraction"));
    };

    img.src = url;
  });
};

/**
 * Format dimensions for display
 * @param dimensions - The image dimensions
 * @returns Formatted string like "1920 × 1080 (16:9)"
 */
export const formatDimensions = (dimensions: ImageDimensions): string => {
  const aspectRatio = dimensions.aspectRatio;
  let ratioText = "";

  // Common aspect ratios - only show these standard ratios
  if (Math.abs(aspectRatio - 16 / 9) < 0.01) ratioText = "16:9";
  else if (Math.abs(aspectRatio - 4 / 3) < 0.01) ratioText = "4:3";
  else if (Math.abs(aspectRatio - 1) < 0.01) ratioText = "1:1";
  else if (Math.abs(aspectRatio - 3 / 2) < 0.01) ratioText = "3:2";
  else if (Math.abs(aspectRatio - 21 / 9) < 0.01) ratioText = "21:9";
  // Don't show aspect ratio for non-standard ratios

  return ratioText
    ? `${dimensions.width} × ${dimensions.height} (${ratioText})`
    : `${dimensions.width} × ${dimensions.height}`;
};

/**
 * Check if image dimensions are valid
 * @param dimensions - The image dimensions
 * @returns boolean - Whether dimensions are valid
 */
export const isValidDimensions = (dimensions: ImageDimensions): boolean => {
  return (
    dimensions.width > 0 &&
    dimensions.height > 0 &&
    isFinite(dimensions.width) &&
    isFinite(dimensions.height)
  );
};
