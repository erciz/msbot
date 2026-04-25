/**
 * Minimal .env loader without external dependencies.
 * Existing process.env values are not overridden.
 */

import fs from "fs";
import path from "path";

export function loadDotEnvFile(fileName = ".env") {
  const envPath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(envPath)) return false;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;

    const key = m[1];
    let value = m[2] || "";

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return true;
}
