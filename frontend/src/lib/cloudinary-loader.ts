/**
 * Custom next/image loader backed by Cloudinary's fetch delivery type.
 *
 * Registering this as `images.loaderFile` turns Vercel's image optimizer off
 * entirely — Next emits Cloudinary URLs and never routes a request through
 * /_next/image, so no optimization units are billed.
 *
 * Fetch mode is what makes this work for Instagram avatars: the source URL is
 * remote, per-account and short-lived, so there is nothing to upload ahead of
 * time. Cloudinary pulls the origin image, transforms it and caches the result.
 *
 * Requires "fetched URL" delivery to be enabled on the Cloudinary account, with
 * Meta's CDNs on the allowed-sources list.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

/** Avatars are square; crop to the face rather than letterboxing. */
const AVATAR_TRANSFORMS = ["c_fill", "g_face"];

interface LoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

/** Same-origin and data URLs are already ours — never send them to Cloudinary. */
function isLocal(src: string): boolean {
  return src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:");
}

export default function cloudinaryLoader({ src, width, quality }: LoaderArgs): string {
  if (isLocal(src)) return src;

  // Without a cloud name there is nothing to build a Cloudinary URL from.
  // Returning the origin URL keeps the markup valid; the avatar itself will be
  // blocked by img-src, which is the loud failure we want over a silent 404.
  if (!CLOUD_NAME) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set — images fall back to their origin URL and will be blocked by CSP."
      );
    }
    return src;
  }

  const transforms = [
    // f_auto lets Cloudinary pick the format per browser. Quality is q_auto
    // unless the caller asked for a specific level — passing both would make
    // Cloudinary reject the URL.
    "f_auto",
    quality ? `q_${quality}` : "q_auto",
    ...AVATAR_TRANSFORMS,
    `w_${width}`,
    `h_${width}`,
  ].join(",");

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transforms}/${encodeURIComponent(src)}`;
}
