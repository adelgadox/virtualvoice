/**
 * The loader is what keeps image optimization off Vercel's bill, so its URL
 * shape and its pass-through cases are worth pinning down directly.
 *
 * Input is always a Cloudinary delivery URL — the backend uploads Instagram
 * avatars into virtualvoice/avatars before storing them.
 */
import loader from "@/lib/cloudinary-loader";

const AVATAR_URL =
  "https://res.cloudinary.com/demo-cloud/image/upload/v1782794310/virtualvoice/avatars/17841400000000000.webp";

// ---------------------------------------------------------------------------
// Transformations
// ---------------------------------------------------------------------------

describe("transformations", () => {
  it("injects them into the delivery path", () => {
    const url = loader({ src: AVATAR_URL, width: 40 });

    expect(url).toContain("/image/upload/f_auto,q_auto,c_fill,g_face,w_40,h_40/");
  });

  it("never emits a Vercel optimizer URL", () => {
    expect(loader({ src: AVATAR_URL, width: 40 })).not.toContain("/_next/image");
  });

  it("requests a square crop at the asked-for width", () => {
    const url = loader({ src: AVATAR_URL, width: 80 });

    expect(url).toContain("w_80");
    expect(url).toContain("h_80");
    expect(url).toContain("c_fill");
  });

  it("lets Cloudinary negotiate format and quality by default", () => {
    const url = loader({ src: AVATAR_URL, width: 40 });

    expect(url).toContain("f_auto");
    expect(url).toContain("q_auto");
  });

  it("uses an explicit quality instead of q_auto when one is given", () => {
    const url = loader({ src: AVATAR_URL, width: 40, quality: 60 });

    expect(url).toContain("q_60");
    expect(url).not.toContain("q_auto");
  });
});

// ---------------------------------------------------------------------------
// Path handling
// ---------------------------------------------------------------------------

describe("path handling", () => {
  it("keeps the version and public id intact", () => {
    const url = loader({ src: AVATAR_URL, width: 40 });

    expect(url).toContain("/v1782794310/virtualvoice/avatars/17841400000000000.webp");
  });

  it("keeps the asset inside the virtualvoice folder", () => {
    expect(loader({ src: AVATAR_URL, width: 40 })).toContain("/virtualvoice/avatars/");
  });

  it("replaces existing transformations instead of stacking them", () => {
    const alreadyTransformed =
      "https://res.cloudinary.com/demo-cloud/image/upload/w_500,h_500,c_fit/v1782794310/virtualvoice/avatars/abc.webp";

    const url = loader({ src: alreadyTransformed, width: 40 });

    expect(url).toContain("w_40,h_40");
    expect(url).not.toContain("w_500");
    expect(url).not.toContain("c_fit");
  });

  it("handles a URL with no version segment", () => {
    const versionless =
      "https://res.cloudinary.com/demo-cloud/image/upload/virtualvoice/avatars/abc.webp";

    const url = loader({ src: versionless, width: 40 });

    expect(url).toBe(
      "https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,c_fill,g_face,w_40,h_40/virtualvoice/avatars/abc.webp"
    );
  });
});

// ---------------------------------------------------------------------------
// Pass-through — the loader applies app-wide, so non-Cloudinary sources must
// survive it untouched
// ---------------------------------------------------------------------------

describe("pass-through", () => {
  it.each([
    ["a root-relative path", "/logo.png"],
    ["a data URL", "data:image/png;base64,iVBORw0KGgo="],
    ["a blob URL", "blob:http://localhost/abc-123"],
    [
      "a Meta CDN URL the backend could not mirror",
      "https://scontent-mad1-1.cdninstagram.com/v/t51.2885-19/profile.jpg",
    ],
    ["a Google avatar", "https://lh3.googleusercontent.com/a/default-user=s96-c"],
  ])("leaves %s untouched", (_label, src) => {
    expect(loader({ src, width: 40 })).toBe(src);
  });
});
