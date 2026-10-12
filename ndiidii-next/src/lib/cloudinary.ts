/**
 * Cloudinary URL helpers. Our product images are stored as plain Cloudinary
 * URLs (no transform params). We append transforms at render time so the sheet
 * stays clean and we can tune framing in one place.
 *
 * g_auto = gravity auto: Cloudinary detects the subject (the bottle) and crops
 * around it, so photos with whitespace around the product fill the card frame
 * without cutting the cap or showing dead space. c_fill + fixed w/h gives a
 * consistent, optimized size for the grid.
 */

const CLOUDINARY_HOST = 'res.cloudinary.com';

export function isCloudinary(url: string | null | undefined): url is string {
  return !!url && url.includes(CLOUDINARY_HOST);
}

/** Card-thumbnail transform: subject-cropped square, webp/auto-quality. */
export function cloudinaryThumb(url: string, size = 900): string {
  // Insert the transform right after /image/upload/
  return url.replace('/image/upload/', `/image/upload/g_auto,c_fill,w_${size},h_${size},q_auto,f_auto/`);
}

/** Full product image (PDP): larger, subject-cropped, auto format/quality. */
export function cloudinaryFull(url: string, width = 900): string {
  return url.replace('/image/upload/', `/image/upload/g_auto,c_fill,w_${width},h_${Math.round(width * 1.25)},q_auto,f_auto/`);
}
