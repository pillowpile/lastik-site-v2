import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const materialsDir = path.join(rootDir, "public", "materials");
const outputPath = path.join(rootDir, "public", "materials-index.json");
const allowedExt = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".webm", ".mov", ".svg"]);

async function listFilesRecursive(folderName, currentPath, relative = "") {
  const entries = await readdir(currentPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const nextRelative = relative ? path.join(relative, entry.name) : entry.name;
    const absolutePath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(folderName, absolutePath, nextRelative)));
      continue;
    }

    if (!allowedExt.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    files.push(`/${path.posix.join("materials", folderName, nextRelative.split(path.sep).join(path.posix.sep))}`);
  }

  return files;
}

async function main() {
  let folders = [];

  try {
    const entries = await readdir(materialsDir, { withFileTypes: true });
    folders = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    folders = [];
  }

  const byFolder = {};
  for (const folder of folders) {
    const files = await listFilesRecursive(folder, path.join(materialsDir, folder));
    byFolder[folder] = files.sort((a, b) => a.localeCompare(b));
  }

  await writeFile(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), folders, byFolder }, null, 2));
}

await main();
