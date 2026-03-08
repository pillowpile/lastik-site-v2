import { mkdir, readdir, rename } from "node:fs/promises";
import { NextResponse } from "next/server";
import path from "node:path";

const MATERIALS_ROOT = path.join(process.cwd(), "public", "materials");
const FILE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".webm", ".mov", ".svg"]);

function normalizeProjectKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function findProjectFolder(projectKey: string): Promise<string | null> {
  const entries = await readdir(MATERIALS_ROOT, { withFileTypes: true });
  const exact = entries.find((entry) => entry.isDirectory() && entry.name === projectKey);
  if (exact) {
    return exact.name;
  }
  const normalized = entries.find((entry) => entry.isDirectory() && entry.name.toLowerCase() === projectKey);
  return normalized ? normalized.name : null;
}

async function listFolders(): Promise<string[]> {
  const entries = await readdir(MATERIALS_ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function listFilesRecursive(root: string, folderName: string, relative = ""): Promise<string[]> {
  const currentPath = path.join(root, relative);
  const entries = await readdir(currentPath, { withFileTypes: true });
  const result: string[] = [];

  for (const entry of entries) {
    const nextRelative = relative ? path.join(relative, entry.name) : entry.name;
    if (entry.isDirectory()) {
      const nested = await listFilesRecursive(root, folderName, nextRelative);
      result.push(...nested);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!FILE_EXTENSIONS.has(ext)) {
      continue;
    }

    const webPath = `/${path.posix.join("materials", folderName, nextRelative.split(path.sep).join(path.posix.sep))}`;
    result.push(webPath);
  }

  return result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wantFolders = searchParams.get("folders") === "1";
  const rawFolder = searchParams.get("folder") ?? "";
  const rawProject = searchParams.get("project") ?? "";
  const folderQuery = normalizeProjectKey(rawFolder);
  const projectKey = normalizeProjectKey(rawProject);

  try {
    const folders = await listFolders();
    if (wantFolders) {
      return NextResponse.json({ folders });
    }

    const lookupKey = folderQuery || projectKey;
    if (!lookupKey) {
      return NextResponse.json({ folder: null, files: [], folders });
    }

    const folder = await findProjectFolder(lookupKey);
    if (!folder) {
      return NextResponse.json({ folder: null, files: [], folders });
    }

    const folderPath = path.join(MATERIALS_ROOT, folder);
    const files = await listFilesRecursive(folderPath, folder);
    files.sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ folder, files, folders });
  } catch {
    return NextResponse.json({ folder: null, files: [], folders: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { projectKey?: string; fromFolder?: string; toFolder?: string };
    const fromFolder = normalizeProjectKey(body.fromFolder ?? "");
    const toFolder = normalizeProjectKey(body.toFolder ?? "");

    if (fromFolder || toFolder) {
      if (!fromFolder || !toFolder) {
        return NextResponse.json({ ok: false, error: "Invalid folder rename request" }, { status: 400 });
      }

      if (fromFolder === toFolder) {
        return NextResponse.json({ ok: true, folder: toFolder });
      }

      await mkdir(MATERIALS_ROOT, { recursive: true });

      const fromResolved = await findProjectFolder(fromFolder);
      if (!fromResolved) {
        return NextResponse.json({ ok: false, error: "Source materials folder not found" }, { status: 404 });
      }

      const toResolved = await findProjectFolder(toFolder);
      if (toResolved) {
        return NextResponse.json({ ok: false, error: "Target materials folder already exists" }, { status: 409 });
      }

      await rename(path.join(MATERIALS_ROOT, fromResolved), path.join(MATERIALS_ROOT, toFolder));
      return NextResponse.json({ ok: true, folder: toFolder });
    }

    const projectKey = normalizeProjectKey(body.projectKey ?? "");
    if (!projectKey) {
      return NextResponse.json({ ok: false, error: "Invalid project key" }, { status: 400 });
    }

    await mkdir(MATERIALS_ROOT, { recursive: true });
    await mkdir(path.join(MATERIALS_ROOT, projectKey), { recursive: true });
    return NextResponse.json({ ok: true, folder: projectKey });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to create project materials folder" }, { status: 500 });
  }
}
