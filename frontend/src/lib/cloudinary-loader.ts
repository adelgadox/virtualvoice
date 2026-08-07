/**
 * Custom next/image loader for Cloudinary-hosted images.
 *
 * Registering this as `images.loaderFile` turns Vercel's image optimizer off
 * entirely — Next emits Cloudinary URLs and never routes a request through
 * /_next/image, so no optimization units are billed.
 *
 * Avatars are uploaded into the virtualvoice/avatars folder by the backend when
 * an Instagram account is connected (app/services/cloudinary_avatar.py), so
 * what arrives here is already a Cloudinary delivery URL. This loader only
 * injects the per-width transformation into it.
 */

/** Matches the delivery segment, with or without transformations already in it. */
const UPLOAD_SEGMENT = "/image/upload/";

/** Anything Cloudinary does not serve is returned untouched. */
function isCloudinary(src: string): boolean {
  return src.includes("res.cloudinary.com") && src.includes(UPLOAD_SEGMENT);
}

interface LoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

export default function cloudinaryLoader({ src, width, quality }: LoaderArgs): string {
  // Local, data: and blob: sources — and anything not on Cloudinary — are left
  // as-is. Returning them unchanged keeps next/image usable for other images
  // without forcing every one of them through Cloudinary.
  if (!isCloudinary(src)) return src;

  const transforms = [
    // f_auto lets Cloudinary pick the format per browser. Quality is q_auto
    // unless the caller asked for a specific level — passing both would make
    // Cloudinary reject the URL.
    "f_auto",
    quality ? `q_${quality}` : "q_auto",
    // Avatars are square; crop to the face rather than letterboxing.
    "c_fill",
    "g_face",
    `w_${width}`,
    `h_${width}`,
  ].join(",");

  const [prefix, path] = src.split(UPLOAD_SEGMENT);

  // Cloudinary paths are `[transforms/]v123/public_id.ext`. Anything before the
  // version is a transformation segment, so anchoring on the version is what
  // stops widths from stacking up across renders. Folder names are keyed off
  // the version too, which is why they survive — the backend always uploads
  // with one. A URL without a version has nothing to strip.
  const versionAt = path.search(/(?:^|\/)v\d+\//);
  const publicPath = versionAt === -1 ? path : path.slice(versionAt).replace(/^\//, "");

  return `${prefix}${UPLOAD_SEGMENT}${transforms}/${publicPath}`;
}
