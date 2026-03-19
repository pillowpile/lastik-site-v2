import { readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const outDir = path.join(rootDir, "out");
const materialsDir = path.join(outDir, "materials");
const materialsIndexPath = path.join(outDir, "materials-index.json");

const TEXT_EXTENSIONS = new Set([".html", ".js", ".mjs", ".json", ".css", ".txt", ".xml", ".map"]);
const ALLOWED_MEDIA_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".webm", ".mov", ".svg"]);

function toPosixPath(value) {
  return value.split(path.sep).join(path.posix.sep);
}

async function listFilesRecursive(currentPath, relative = "") {
  const entries = await readdir(currentPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const nextRelative = relative ? path.join(relative, entry.name) : entry.name;
    const absolutePath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(absolutePath, nextRelative)));
      continue;
    }
    files.push({ absolutePath, relativePath: nextRelative });
  }

  return files;
}

function extractMaterialRefs(text) {
  const refs = new Set();
  const matches = text.match(/\/materials\/[^\s"'`<>)\\]+/g) ?? [];

  for (const rawMatch of matches) {
    const withoutQuery = rawMatch.split(/[?#]/, 1)[0];
    const normalized = withoutQuery.replace(/\/+$/, "");
    if (!normalized || normalized === "/materials") {
      continue;
    }
    try {
      refs.add(decodeURIComponent(normalized));
    } catch {
      refs.add(normalized);
    }
  }

  return refs;
}

async function collectReferencedMaterialPaths() {
  const files = await listFilesRecursive(outDir);
  const referenced = new Set();

  for (const file of files) {
    const ext = path.extname(file.absolutePath).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext)) {
      continue;
    }
    const content = await readFile(file.absolutePath, "utf8");
    const refs = extractMaterialRefs(content);
    for (const ref of refs) {
      referenced.add(ref);
    }
  }

  return referenced;
}

async function removeEmptyDirectories(currentPath) {
  const entries = await readdir(currentPath, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const dirPath = path.join(currentPath, entry.name);
    await removeEmptyDirectories(dirPath);
  }

  const rest = await readdir(currentPath);
  if (rest.length === 0) {
    await rm(currentPath, { recursive: true, force: true });
  }
}

async function buildOutMaterialsIndex() {
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
    const folderPath = path.join(materialsDir, folder);
    const files = await listFilesRecursive(folderPath);
    byFolder[folder] = files
      .map(({ relativePath }) => relativePath)
      .filter((relativePath) => ALLOWED_MEDIA_EXTENSIONS.has(path.extname(relativePath).toLowerCase()))
      .map((relativePath) => `/${path.posix.join("materials", folder, toPosixPath(relativePath))}`)
      .sort((a, b) => a.localeCompare(b));
  }

  await writeFile(materialsIndexPath, JSON.stringify({ generatedAt: new Date().toISOString(), folders, byFolder }, null, 2));
}

async function main() {
  try {
    await stat(materialsDir);
  } catch {
    console.log("No out/materials directory found, skipping prune.");
    return;
  }

  const referenced = await collectReferencedMaterialPaths();
  const files = await listFilesRecursive(materialsDir);

  let removedCount = 0;
  let removedBytes = 0;

  for (const file of files) {
    const webPath = `/${path.posix.join("materials", toPosixPath(file.relativePath))}`;
    if (referenced.has(webPath)) {
      continue;
    }
    const fileStat = await stat(file.absolutePath);
    removedBytes += fileStat.size;
    removedCount += 1;
    await rm(file.absolutePath, { force: true });
  }

  await removeEmptyDirectories(materialsDir);
  await buildOutMaterialsIndex();

  const removedMb = (removedBytes / (1024 * 1024)).toFixed(2);
  console.log(`Pruned out/materials: removed ${removedCount} files (${removedMb} MB).`);
}

await main();
