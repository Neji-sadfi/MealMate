import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// Builds app/sw.ts and serves it at /serwist/sw.js.
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: "app/sw.ts",
    additionalPrecacheEntries: [{ url: "/~offline", revision }],
    useNativeEsbuild: true,
  },
);
