import { watch } from "node:fs";
import { generateMaterialsIndex, materialsDir } from "./generate-materials-index.mjs";

let timer = null;

async function rebuild() {
  try {
    await generateMaterialsIndex();
  } catch (error) {
    console.error("[materials-index] rebuild failed", error);
  }
}

function scheduleRebuild() {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => {
    timer = null;
    void rebuild();
  }, 150);
}

void rebuild();

const watcher = watch(materialsDir, { recursive: true }, () => {
  scheduleRebuild();
});

process.on("SIGINT", () => {
  watcher.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  watcher.close();
  process.exit(0);
});

