/**
 * The loader is what keeps image optimization off Vercel's bill, so its URL
 * shape and its pass-through cases are worth pinning down directly.
 *
 * It reads NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME at module scope, so the
 * cloud-name cases re-import it under jest.isolateModulesAsync with a
 * different env.
 */

const REMOTE_SRC = "https://scontent-mad1-1.cdninstagram.com/v/t51.2885-19/profile.jpg";

type Loader = (args: { src: string; width: number; quality?: number }) => string;

/** Load the loader fresh with a specific cloud name (or none at all). */
async function loadWith(cloudName: string | undefined): Promise<Loader> {
  const previous = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  let loader!: Loader;

  await jest.isolateModulesAsync(async () => {
    if (cloudName === undefined) {
      delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    } else {
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = cloudName;
    }

    loader = (await import("@/lib/cloudinary-loader")).default;
  });

  if (previous === undefined) {
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  } else {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = previous;
  }

  return loader;
}

let loader: Loader;

beforeAll(async () => {
  loader = await loadWith("demo-cloud");
});

// ---------------------------------------------------------------------------
// URL shape
// ---------------------------------------------------------------------------

describe("URL shape", () => {
  it("builds a Cloudinary fetch URL for the configured cloud", () => {
    const url = loader({ src: REMOTE_SRC, width: 40 });

    expect(url.startsWith("https://res.cloudinary.com/demo-cloud/image/fetch/")).toBe(true);
  });

  it("never emits a Vercel optimizer URL", () => {
    expect(loader({ src: REMOTE_SRC, width: 40 })).not.toContain("/_next/image");
  });

  it("url-encodes the origin URL so its query string cannot break the path", () => {
    const signed = `${REMOTE_SRC}?_nc_ht=x&oh=abc&oe=123`;
    const url = loader({ src: signed, width: 40 });

    expect(url).toContain(encodeURIComponent(signed));
    // The origin's separators must not survive as literal URL syntax.
    expect(url.split("/image/fetch/")[1]).not.toContain("?");
    expect(url.split("/image/fetch/")[1]).not.toContain("&");
  });

  it("requests a square crop at the asked-for width", () => {
    const url = loader({ src: REMOTE_SRC, width: 80 });

    expect(url).toContain("w_80");
    expect(url).toContain("h_80");
    expect(url).toContain("c_fill");
  });

  it("lets Cloudinary negotiate format and quality by default", () => {
    const url = loader({ src: REMOTE_SRC, width: 40 });

    expect(url).toContain("f_auto");
    expect(url).toContain("q_auto");
  });

  it("uses an explicit quality instead of q_auto when one is given", () => {
    const url = loader({ src: REMOTE_SRC, width: 40, quality: 60 });

    expect(url).toContain("q_60");
    expect(url).not.toContain("q_auto");
  });
});

// ---------------------------------------------------------------------------
// Pass-through
// ---------------------------------------------------------------------------

describe("pass-through", () => {
  it.each([
    ["a root-relative path", "/logo.png"],
    ["a data URL", "data:image/png;base64,iVBORw0KGgo="],
    ["a blob URL", "blob:http://localhost/abc-123"],
  ])("leaves %s untouched", (_label, src) => {
    expect(loader({ src, width: 40 })).toBe(src);
  });

  it("returns the origin URL when no cloud name is configured", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    const bare = await loadWith(undefined);
    expect(bare({ src: REMOTE_SRC, width: 40 })).toBe(REMOTE_SRC);

    warn.mockRestore();
  });

  it("warns outside production when the cloud name is missing", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    const bare = await loadWith(undefined);
    bare({ src: REMOTE_SRC, width: 40 });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"));
    warn.mockRestore();
  });
});
