export const HERO_BY_FOLDER: Record<string, string> = {
  eapteka: "/materials/eapteka/sber_eapteka_hero.mp4",
  "love-generation": "/materials/love-generation/love_generation (1080p)_1_prob4.mp4",
  sobchak: "/materials/sobchak/sobchak_hero.mp4",
  mts: "/materials/mts/mts_hero.mp4",
  "mail-ru": "/materials/mail-ru/mail_hero.mp4",
  rocs: "/materials/rocs/rocs_hero.mp4",
  "sber-terminal": "/materials/sber-terminal/sber-terminal_hero.mp4",
  uralsib: "/materials/uralsib/uralsib_hero.mp4",
  "vtb-1": "/materials/vtb-1/ВТБ финал.mp4",
  zvuk: "/materials/zvuk/zvuk_hero.mp4",
  "yandex-incl": "/materials/yandex-incl/Баскетбол_hero.mp4",
};

export const THUMB_BY_FOLDER: Record<string, string> = {
  eapteka: "/materials/eapteka/eapteka_thumb.webm",
  "love-generation": "/materials/love-generation/thumb/love_generation-thumb.mp4",
  rocs: "/materials/rocs/rocs_thumb.webm",
  mts: "/materials/mts/thumb/mts-thumb.mp4",
  sobchak: "/materials/sobchak/thumb/sobchak_thumb.mp4",
  uralsib: "/materials/uralsib/thumb/uralsib-thumb.mp4",
  "mail-ru": "/materials/mail-ru/thumb/mail-thumb.mp4",
  zvuk: "/materials/zvuk/thumb/zvuk-thumb.mp4",
  "vk-miniapps": "/materials/vk-miniapps/thumb/miniapps-thumb.png",
  "vk-neo": "/materials/vk-neo/thumb/NEO_pw.mp4",
  "sber-terminal": "/materials/sber-terminal/thumb/sber-terminal-thumb.png",
  "vtb-1": "/materials/vtb-1/thumb/vtb-1-thumb.mp4",
  "yandex-incl": "/materials/yandex-incl/thumb/ya_incl-thumb.mp4",
};

export function sanitizeProjectKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function canonicalProjectSlug(raw: string): string {
  const normalized = sanitizeProjectKey(raw);
  if (normalized === "vk-heo") {
    return "vk-neo";
  }
  if (normalized === "r-o-c-s") {
    return "rocs";
  }
  if (normalized === "mtc") {
    return "mts";
  }
  return normalized;
}

export function normalizeLookup(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function keyToSlug(projectKey: string): string {
  const withDashes = projectKey.replace(/([a-z0-9])([A-Z])/g, "$1-$2");
  const normalized = canonicalProjectSlug(withDashes);
  if (!normalized) {
    return "project";
  }
  if (normalized === "vk-mini-apps") {
    return "vk-miniapps";
  }
  return normalized;
}

function isExternalAssetPath(src: string): boolean {
  return /^(https?:)?\/\//i.test(src) || src.startsWith("data:") || src.startsWith("blob:");
}

export function normalizeAssetPath(raw: string | undefined, projectFolder?: string): string | undefined {
  if (!raw) {
    return undefined;
  }

  let src = raw.trim();
  if (!src) {
    return undefined;
  }

  if (isExternalAssetPath(src)) {
    return src;
  }

  src = src.replace(/\\/g, "/");
  src = src.replace(/mateirals/gi, "materials");

  if (/^materials\//i.test(src)) {
    src = `/${src}`;
  }

  if (!src.startsWith("/")) {
    if (projectFolder) {
      const fileName = src.split("/").pop() ?? src;
      src = `/materials/${projectFolder}/${fileName}`;
    } else {
      src = `/${src}`;
    }
  }

  src = src.replace(/\/{2,}/g, "/");
  return src;
}

export function projectContentScore(project: {
  introTexts: string[];
  sections: Array<{ blocks: unknown[] }>;
  heroVideoSrc?: string;
}): number {
  const introScore = project.introTexts.length * 10;
  const sectionsScore = project.sections.length * 30;
  const blocksScore = project.sections.reduce((sum, section) => sum + section.blocks.length, 0) * 4;
  const heroScore = project.heroVideoSrc ? 1 : 0;
  return introScore + sectionsScore + blocksScore + heroScore;
}
