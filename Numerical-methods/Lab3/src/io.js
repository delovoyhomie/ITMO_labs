import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export function ensureDirectory(targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
}

export function writeTextFile(targetPath, content) {
  ensureDirectory(targetPath);
  fs.writeFileSync(targetPath, content, "utf8");
}

export function readJsonFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content);
}

export function createPrompt() {
  return readline.createInterface({ input, output });
}
