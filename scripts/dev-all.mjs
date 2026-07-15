import { spawn } from "node:child_process";
import process from "node:process";

// No Windows o npm é um .cmd, e o Node se recusa a executá-lo direto desde a
// correção de segurança do spawn (EINVAL). Só roda passando pelo shell.
const win = process.platform === "win32";
const npm = win ? "npm.cmd" : "npm";
const opts = { stdio: "inherit", shell: win };
const children = [
  spawn(npm, ["run", "dev"], opts),
  spawn(npm, ["--prefix", "integrations/monitorodds", "run", "collect"], opts),
];

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGINT");
  setTimeout(() => process.exit(code), 500);
}

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
for (const child of children) {
  child.on("exit", (code) => {
    if (!stopping && code && code !== 0) stop(code);
  });
}
