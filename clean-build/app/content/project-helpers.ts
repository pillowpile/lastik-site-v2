export const HERO_BY_FOLDER: Record<string, string> = {
  eapteka: "/materials/eapteka/sber_eapteka_hero.mp4",
  "love-generation": "/materials/love-generation/love_generation (1080p)_1_prob4.mp4",
  sobchak: "/materials/sobchak/sobchak_hero.mp4",
  mts: "/materials/mts/mts_hero.mp4",
  "mail-ru": "/materials/mail-ru/mail_hero.mp4",
  delimobil: "/materials/delimobil/delimobil_hero.mp4",
  "green-idea": "/materials/green-idea/green-idea_hero.mp4",
  hospitality: "/materials/hospitality/hospitality_hero.mp4",
  mosmuseum: "/materials/mosmuseum/mosmuseum_hero.mp4",
  "presents-fest-2024": "/materials/presents-fest-2024/presents-fest-2024_hero.mp4",
  rocs: "/materials/rocs/rocs_hero.mp4",
  "saint-spring-v3": "/materials/saint-spring-v3/saint-spring-v3_hero.mp4",
  "sber-terminal": "/materials/sber-terminal/sber-terminal_hero.mp4",
  "sber-high-res": "/materials/sber-high-res/sber-high-res_hero.mp4",
  mansi: "/materials/mansi/mansi_hero.mp4",
  "stranneyshie-horiz": "/materials/stranneyshie-horiz/stranneyshie-horiz_hero.mp4",
  "supermarket-trollys-dream-v1": "/materials/supermarket-trollys-dream-v1/supermarket-trollys-dream-v1_hero.mp4",
  "taxi-v2": "/materials/taxi-v2/taxi-v2_hero.mp4",
  "the-skin-v1": "/materials/the-skin-v1/the-skin-v1_hero.mp4",
  unprincipled: "/materials/unprincipled/unprincipled_hero.mp4",
  uralsib: "/materials/uralsib/uralsib_hero.mp4",
  volchok: "/materials/volchok/volchok_hero.mp4",
  "vtb-1": "/materials/vtb-1/ВТБ финал.mp4",
  zvuk: "/materials/zvuk/zvuk_hero.mp4",
  "zvuk-2": "/materials/zvuk-2/zvuk-2_hero.mp4",
  "yandex-incl": "/materials/yandex-incl/Баскетбол_hero.mp4",
  "i-want-to-know-everything": "/materials/i-want-to-know-everything/i-want-to-know-everything_hero.mp4",
};

export const THUMB_BY_FOLDER: Record<string, string> = {
  eapteka: "/materials/eapteka/eapteka_thumb.webm",
  "love-generation": "/materials/love-generation/thumb/love_generation-thumb.mp4",
  rocs: "/materials/rocs/rocs_thumb.webm",
  mts: "/materials/mts/thumb/mts-thumb.mp4",
  sobchak: "/materials/sobchak/thumb/sobchak_thumb.mp4",
  uralsib: "/materials/uralsib/thumb/uralsib-thumb.mp4",
  "mail-ru": "/materials/mail-ru/thumb/mail-thumb.mp4",
  delimobil: "/materials/delimobil/thumb/delimobil-thumb.webm",
  "green-idea": "/materials/green-idea/thumb/green-idea-thumb.mp4",
  hospitality: "/materials/hospitality/thumb/hospitality-thumb.mp4",
  mosmuseum: "/materials/mosmuseum/thumb/mosmuseum-thumb.mp4",
  "presents-fest-2024": "/materials/presents-fest-2024/thumb/presents-fest-2024-thumb.mp4",
  zvuk: "/materials/zvuk/thumb/zvuk-thumb.mp4",
  "vk-miniapps": "/materials/vk-miniapps/thumb/miniapps-thumb.png",
  "vk-neo": "/materials/vk-neo/thumb/NEO_pw.mp4",
  "sber-terminal": "/materials/sber-terminal/thumb/sber-terminal-thumb.png",
  "sber-high-res": "/materials/sber-high-res/thumb/sber-high-res-thumb.mp4",
  mansi: "/materials/mansi/thumb/mansi-thumb.mp4",
  "stranneyshie-horiz": "/materials/stranneyshie-horiz/thumb/stranneyshie-horiz-thumb.mp4",
  "saint-spring-v3": "/materials/saint-spring-v3/thumb/saint-spring-v3-thumb.mp4",
  "supermarket-trollys-dream-v1": "/materials/supermarket-trollys-dream-v1/thumb/supermarket-trollys-dream-v1-thumb.mp4",
  "taxi-v2": "/materials/taxi-v2/thumb/taxi-v2-thumb.mp4",
  "the-skin-v1": "/materials/the-skin-v1/thumb/the-skin-v1-thumb.mp4",
  unprincipled: "/materials/unprincipled/thumb/unprincipled-thumb.mp4",
  "vtb-1": "/materials/vtb-1/thumb/vtb-1-thumb.mp4",
  volchok: "/materials/volchok/thumb/volchok-thumb.mp4",
  "yandex-incl": "/materials/yandex-incl/thumb/ya_incl-thumb.mp4",
  "i-want-to-know-everything": "/materials/i-want-to-know-everything/thumb/i-want-to-know-everything-thumb.mp4",
  "zvuk-2": "/materials/zvuk-2/thumb/zvuk-2-thumb.mp4",
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
