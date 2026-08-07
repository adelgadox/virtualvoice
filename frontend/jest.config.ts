import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // next build swaps this module for images.loaderFile via a webpack alias.
    // Jest does not run that alias, so map it here — otherwise next/image
    // renders with the default loader and the tests would assert nothing real.
    "^next/dist/shared/lib/image-loader(\\.js)?$": "<rootDir>/src/lib/cloudinary-loader.ts",
  },
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  collectCoverageFrom: [
    "src/components/**/*.{ts,tsx}",
    "src/lib/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
  ],
};

export default createJestConfig(config);
