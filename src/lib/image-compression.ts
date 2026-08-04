import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file before upload to save bandwidth and storage.
 * @param file The original File object from the file input
 * @param options Optional overrides for compression settings
 * @returns A Promise resolving to the compressed File
 */
export async function compressImage(file: File, options?: { maxSizeMB?: number; maxWidthOrHeight?: number }): Promise<File> {
    const defaultOptions = {
        maxSizeMB: 0.5, // 500KB
        maxWidthOrHeight: 1920, // max dimension 1920px (HD)
        useWebWorker: true,
        fileType: 'image/webp' // Convert to WebP for better compression
    };

    const mergedOptions = { ...defaultOptions, ...options };

    try {
        const compressedFile = await imageCompression(file, mergedOptions);
        
        // Sometimes the "compressed" file is larger for already optimized small images.
        // If so, return the original.
        if (compressedFile.size > file.size) {
            return file;
        }
        
        return compressedFile;
    } catch (error) {
        console.error("Image compression error:", error);
        // Fallback to the original file if compression fails (e.g. unsupported format)
        return file;
    }
}
