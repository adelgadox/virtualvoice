import "@testing-library/jest-dom";

// The Cloudinary loader reads this at module scope, so it has to exist before
// any test imports next/image. Value is arbitrary — tests assert the URL shape,
// not the account.
process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??= "test-cloud";
