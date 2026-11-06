import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const nextCli = path.join(scriptDirectory, "..", "node_modules", "next", "dist", "bin", "next");
const useSystemCa = process.allowedNodeEnvironmentFlags.has("--use-system-ca");
const env = { ...process.env };

if (useSystemCa) {
  const nodeOptions = env.NODE_OPTIONS?.trim() ?? "";
  if (!nodeOptions.split(/\s+/).includes("--use-system-ca")) {
    env.NODE_OPTIONS = [nodeOptions, "--use-system-ca"].filter(Boolean).join(" ");
  }
  console.info("Starting Next.js with system CA trust enabled.");
}

const child = spawn(process.execPath, [nextCli, ...process.argv.slice(2)], {
  env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("Could not start Next.js", error);
  process.exitCode = 1;
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
