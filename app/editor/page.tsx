"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { generateRandomStyleName } from "@/app/content/reference-style";
import { cloneDefaultContent, loadSiteContent, resetSiteContent, saveSiteContent } from "@/app/content/storage";
import type { ContentRow, MediaItem, ProjectPageContent, ProjectTag, SectionBlock, SiteContent } from "@/app/content/types";

type SpecialPageKey = keyof SiteContent["specialPages"];
type EditorTab = "home" | "project" | SpecialPageKey;
type ProjectKey = string;
const EDITOR_TAGS: ProjectTag[] = ["2d", "3d", "ai", "mix"];
const SPECIAL_PAGE_KEYS: SpecialPageKey[] = ["artdirCourse", "studio", "contacts"];
const EAPTEKA_SEEDED_KEY = "lastik.editor.eapteka-seeded.v1";
const EAPTEKA_THUMBNAIL_SRC = "/materials/eapteka/eapteka_thumb.webm";
const HERO_BY_FOLDER: Record<string, string> = {
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
const THUMB_BY_FOLDER: Record<string, string> = {
  eapteka: "/materials/eapteka/eapteka_thumb.webm",
  delimobil: "/materials/delimobil/thumb/delimobil-thumb.webm",
  "green-idea": "/materials/green-idea/thumb/green-idea-thumb.mp4",
  hospitality: "/materials/hospitality/thumb/hospitality-thumb.mp4",
  mosmuseum: "/materials/mosmuseum/thumb/mosmuseum-thumb.mp4",
  "presents-fest-2024": "/materials/presents-fest-2024/thumb/presents-fest-2024-thumb.mp4",
  rocs: "/materials/rocs/rocs_thumb.webm",
  mts: "/materials/mts/thumb/mts-thumb.mp4",
  sobchak: "/materials/sobchak/thumb/sobchak_thumb.mp4",
  uralsib: "/materials/uralsib/thumb/uralsib-thumb.mp4",
  "mail-ru": "/materials/mail-ru/thumb/mail-thumb.mp4",
  "i-want-to-know-everything": "/materials/i-want-to-know-everything/thumb/i-want-to-know-everything-thumb.mp4",
  mansi: "/materials/mansi/thumb/mansi-thumb.mp4",
  "stranneyshie-horiz": "/materials/stranneyshie-horiz/thumb/stranneyshie-horiz-thumb.mp4",
  "sber-high-res": "/materials/sber-high-res/thumb/sber-high-res-thumb.mp4",
  unprincipled: "/materials/unprincipled/thumb/unprincipled-thumb.mp4",
  "saint-spring-v3": "/materials/saint-spring-v3/thumb/saint-spring-v3-thumb.mp4",
  "supermarket-trollys-dream-v1": "/materials/supermarket-trollys-dream-v1/thumb/supermarket-trollys-dream-v1-thumb.mp4",
  "taxi-v2": "/materials/taxi-v2/thumb/taxi-v2-thumb.mp4",
  "the-skin-v1": "/materials/the-skin-v1/thumb/the-skin-v1-thumb.mp4",
  volchok: "/materials/volchok/thumb/volchok-thumb.mp4",
  zvuk: "/materials/zvuk/thumb/zvuk-thumb.mp4",
  "zvuk-2": "/materials/zvuk-2/thumb/zvuk-2-thumb.mp4",
  "vk-miniapps": "/materials/vk-miniapps/thumb/miniapps-thumb.png",
  "vk-neo": "/materials/vk-neo/thumb/NEO_pw.mp4",
  "sber-terminal": "/materials/sber-terminal/thumb/sber-terminal-thumb.png",
  "vtb-1": "/materials/vtb-1/thumb/vtb-1-thumb.mp4",
  "yandex-incl": "/materials/yandex-incl/thumb/ya_incl-thumb.mp4",
};
type MaterialsIndex = {
  generatedAt?: string;
  folders: string[];
  byFolder: Record<string, string[]>;
};

type DragState = {
  listKey: string;
  index: number;
} | null;

function parseSectionBlocksListKey(listKey: string): { sectionIndex: number } | null {
  const match = listKey.match(/^project\.section\.(\d+)\.blocks$/);
  if (!match) {
    return null;
  }
  const sectionIndex = Number(match[1]);
  if (!Number.isInteger(sectionIndex) || sectionIndex < 0) {
    return null;
  }
  return { sectionIndex };
}

function reorder<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) {
    return next;
  }
  next.splice(to, 0, moved);
  return next;
}

function rowClassOptions(): Array<ContentRow["layout"]> {
  return ["row-1", "row-2", "row-3", "grid-3"];
}

function mediaTypeFromSrc(src: string): MediaItem["type"] {
  const lower = src.toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov")) {
    return "video";
  }
  if (lower.endsWith(".gif")) {
    return "gif";
  }
  return "image";
}

function isExternalAssetPath(src: string): boolean {
  return /^(https?:)?\/\//i.test(src) || src.startsWith("data:") || src.startsWith("blob:");
}

function normalizeAssetPath(raw: string | undefined, projectFolder?: string): string | undefined {
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

async function loadMaterialsIndex(): Promise<MaterialsIndex> {
  try {
    const response = await fetch("/materials-index.json", { cache: "no-store" });
    if (!response.ok) {
      return { folders: [], byFolder: {} };
    }
    const payload = (await response.json()) as Partial<MaterialsIndex>;
    const generatedAt = typeof payload.generatedAt === "string" ? payload.generatedAt : undefined;
    const folders = Array.isArray(payload.folders) ? payload.folders.filter((item): item is string => typeof item === "string") : [];
    const byFolder = payload.byFolder && typeof payload.byFolder === "object" ? payload.byFolder : {};
    return { generatedAt, folders, byFolder: byFolder as Record<string, string[]> };
  } catch {
    return { folders: [], byFolder: {} };
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function randomHomeCardLayout(): { top: number; left: number; width: number } {
  return {
    top: Math.round(140 + Math.random() * 1120),
    left: Number((2 + Math.random() * 80).toFixed(2)),
    width: Number((16 + Math.random() * 20).toFixed(2)),
  };
}

function filePrefixFromSrc(src: string): string {
  const filename = src.split("/").pop() ?? src;
  const base = filename.replace(/\.[^/.]+$/, "");
  const firstToken = base.split(/[-_\s]/)[0] ?? base;
  const normalized = firstToken.replace(/\d+$/, "");
  return normalized || firstToken || base;
}

function asProject(content: SiteContent, key: ProjectKey): ProjectPageContent {
  return content.projects[key];
}

function sanitizeProjectKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function canonicalProjectSlug(raw: string): string {
  const normalized = sanitizeProjectKey(raw);
  if (normalized === "vk-heo") {
    return "vk-neo";
  }
  if (normalized === "mtc") {
    return "mts";
  }
  return normalized;
}

function normalizeLookup(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function resolveMaterialsFolderName(folders: string[], raw: string): string | null {
  const target = normalizeLookup(canonicalProjectSlug(raw));
  if (!target) {
    return null;
  }
  for (const folder of folders) {
    if (normalizeLookup(canonicalProjectSlug(folder)) === target) {
      return folder;
    }
  }
  return null;
}

function findProjectKeyByTitle(projects: SiteContent["projects"], needle: string): string | null {
  const target = needle.trim().toLowerCase();
  if (!target) {
    return null;
  }
  for (const [key, project] of Object.entries(projects)) {
    if (project.title?.toLowerCase().includes(target)) {
      return key;
    }
  }
  return null;
}

function findProjectKeyByMaterialsFolder(projects: SiteContent["projects"], folder: string): string | null {
  const target = normalizeLookup(canonicalProjectSlug(folder));
  if (!target) {
    return null;
  }
  for (const [key, project] of Object.entries(projects)) {
    const projectFolder = sanitizeProjectKey(project.materialsFolder ?? "") || keyToSlug(key);
    if (normalizeLookup(canonicalProjectSlug(projectFolder)) === target) {
      return key;
    }
  }
  return null;
}

function moveProjectKey(projects: SiteContent["projects"], fromKey: string, toKey: string): void {
  if (!fromKey || !toKey || fromKey === toKey || !projects[fromKey] || projects[toKey]) {
    return;
  }
  projects[toKey] = projects[fromKey];
  delete projects[fromKey];
}

function isProjectPlaceholder(project: ProjectPageContent): boolean {
  return !project.heroVideoSrc && project.introTexts.length === 0 && project.sections.length === 0;
}

function projectContentScore(project: ProjectPageContent): number {
  const introScore = project.introTexts.length * 10;
  const sectionsScore = project.sections.length * 30;
  const blocksScore = project.sections.reduce((sum, section) => sum + section.blocks.length, 0) * 4;
  const heroScore = project.heroVideoSrc ? 1 : 0;
  return introScore + sectionsScore + blocksScore + heroScore;
}

function isEaptekaLikeProject(key: string, project: ProjectPageContent): boolean {
  const byKey = normalizeLookup(key) === "eapteka";
  const bySlug = normalizeLookup(keyToSlug(key)) === "eapteka";
  const folder = sanitizeProjectKey(project.materialsFolder ?? "") || keyToSlug(key);
  const byFolder = normalizeLookup(canonicalProjectSlug(folder)) === "eapteka";
  const titleLower = (project.title ?? "").toLowerCase();
  const byTitle = titleLower.includes("eapteka") || titleLower.includes("аптека");
  const heroLower = (project.heroVideoSrc ?? "").toLowerCase();
  const byHeroPath = heroLower.includes("/materials/eapteka/");
  return byKey || bySlug || byFolder || byTitle || byHeroPath;
}

function keyToSlug(projectKey: string): string {
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

function hrefToProjectSlug(href?: string): string | null {
  if (!href) {
    return null;
  }
  const match = href.match(/^\/projects\/([^/?#]+)/i);
  return match ? canonicalProjectSlug(match[1]) : null;
}

function resolveProjectKeyBySlug(projects: SiteContent["projects"], slug: string): string | null {
  const target = normalizeLookup(canonicalProjectSlug(slug));
  const targets = new Set<string>([target]);
  if (target === "mts") {
    targets.add("mtc");
  }
  if (target === "mtc") {
    targets.add("mts");
  }

  let bestKey: string | null = null;
  let bestScore = -1;

  for (const [key, project] of Object.entries(projects)) {
    const byKey = normalizeLookup(key);
    const bySlug = normalizeLookup(keyToSlug(key));
    const folder = sanitizeProjectKey(project.materialsFolder ?? "") || keyToSlug(key);
    const byFolder = normalizeLookup(canonicalProjectSlug(folder));
    if (!targets.has(byKey) && !targets.has(bySlug) && !targets.has(byFolder)) {
      continue;
    }
    const score = projectContentScore(project);
    if (score > bestScore) {
      bestKey = key;
      bestScore = score;
    }
  }

  if (bestKey) {
    return bestKey;
  }

  return projects[slug] ? slug : null;
}

function findProjectAliasKeyBySlug(projects: SiteContent["projects"], slug: string, skipKey?: string): string | null {
  const target = normalizeLookup(canonicalProjectSlug(slug));
  if (!target) {
    return null;
  }
  let placeholderCandidate: string | null = null;
  for (const [key, project] of Object.entries(projects)) {
    if (skipKey && key === skipKey) {
      continue;
    }
    const byKey = normalizeLookup(key);
    const bySlug = normalizeLookup(keyToSlug(key));
    const byFolder = normalizeLookup(canonicalProjectSlug(sanitizeProjectKey(project.materialsFolder ?? "") || keyToSlug(key)));
    if (byKey !== target && bySlug !== target && byFolder !== target) {
      continue;
    }
    if (!isProjectPlaceholder(project)) {
      return key;
    }
    if (!placeholderCandidate) {
      placeholderCandidate = key;
    }
  }
  return placeholderCandidate;
}

function nextHomeCardId(projects: SiteContent["home"]["projects"]): string {
  const max = projects.reduce((acc, card) => {
    const match = card.id.match(/^p(\d+)$/i);
    if (!match) {
      return acc;
    }
    const n = Number(match[1]);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return `p${max + 1}`;
}

function nextHomeRowId(rows: NonNullable<SiteContent["home"]["rows"]>): string {
  const max = rows.reduce((acc, row) => {
    const match = row.id.match(/^r(\d+)$/i);
    if (!match) {
      return acc;
    }
    const n = Number(match[1]);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return `r${max + 1}`;
}

function nextHomeStickerId(stickers: NonNullable<SiteContent["home"]["stickers"]>): string {
  const max = stickers.reduce((acc, sticker) => {
    const match = sticker.id.match(/^s(\d+)$/i);
    if (!match) {
      return acc;
    }
    const n = Number(match[1]);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return `s${max + 1}`;
}

function buildDefaultHomeRowsFromCards(cards: SiteContent["home"]["projects"]): Array<{ id: string; projectIds: string[] }> {
  const ids = cards.map((card) => card.id);
  const rows: Array<{ id: string; projectIds: string[] }> = [];
  let offset = 0;
  let rowNumber = 1;
  while (offset < ids.length) {
    const size = rowNumber % 3 === 1 ? 2 : rowNumber % 3 === 2 ? 3 : 1;
    rows.push({
      id: `r${rowNumber}`,
      projectIds: ids.slice(offset, offset + size),
    });
    offset += size;
    rowNumber += 1;
  }
  return rows;
}

function createProjectTemplate(projectKey: string, title: string): ProjectPageContent {
  const normalizedKey = sanitizeProjectKey(projectKey);
  return {
    backLabel: "← Back to projects",
    title: title.trim() || projectKey,
    materialsFolder: normalizedKey,
    referenceStyle: {
      mode: "default",
      siteUrl: "",
      styleName: "",
      useThisStyle: false,
      useSiteStyle: true,
    },
    heroVideoSrc: HERO_BY_FOLDER[normalizedKey],
    introTexts: [],
    sections: [],
    thanksText: "",
  };
}

function isSpecialPageKey(value: EditorTab): value is SpecialPageKey {
  return SPECIAL_PAGE_KEYS.includes(value as SpecialPageKey);
}

function ensureSpecialPages(content: SiteContent): SiteContent {
  const next = structuredClone(content);
  if (!next.specialPages || typeof next.specialPages !== "object") {
    next.specialPages = structuredClone(cloneDefaultContent().specialPages);
  }
  for (const key of SPECIAL_PAGE_KEYS) {
    if (!next.specialPages[key]) {
      next.specialPages[key] = structuredClone(cloneDefaultContent().specialPages[key]);
    }
    const tags = Array.isArray(next.specialPages[key].tags) ? next.specialPages[key].tags : [];
    next.specialPages[key].tags = Array.from(new Set(tags.filter((tag): tag is ProjectTag => EDITOR_TAGS.includes(tag as ProjectTag))));
  }
  for (const key of Object.keys(next.projects)) {
    const tags = Array.isArray(next.projects[key].tags) ? next.projects[key].tags : [];
    next.projects[key].tags = Array.from(new Set(tags.filter((tag): tag is ProjectTag => EDITOR_TAGS.includes(tag as ProjectTag))));
  }
  return next;
}

function ensureHomeProjectLinksAndEntries(content: SiteContent): SiteContent {
  const next = structuredClone(content);

  const sobchakByFolder = findProjectKeyByMaterialsFolder(next.projects, "sobchak");
  if (!next.projects.sobchak && sobchakByFolder) {
    moveProjectKey(next.projects, sobchakByFolder, "sobchak");
  } else {
    const sobchakByTitle = findProjectKeyByTitle(next.projects, "собчак");
    if (!next.projects.sobchak && sobchakByTitle) {
      moveProjectKey(next.projects, sobchakByTitle, "sobchak");
    }
  }

  const eaptekaByFolder = findProjectKeyByMaterialsFolder(next.projects, "eapteka");
  const eaptekaByTitle = findProjectKeyByTitle(next.projects, "eapteka") ?? findProjectKeyByTitle(next.projects, "аптека");
  const eaptekaByAlias = findProjectAliasKeyBySlug(next.projects, "eapteka", "eapteka");
  if (!next.projects.eapteka && eaptekaByFolder) {
    moveProjectKey(next.projects, eaptekaByFolder, "eapteka");
  } else if (!next.projects.eapteka && eaptekaByTitle) {
    moveProjectKey(next.projects, eaptekaByTitle, "eapteka");
  } else if (!next.projects.eapteka && eaptekaByAlias) {
    moveProjectKey(next.projects, eaptekaByAlias, "eapteka");
  }

  if (!next.projects.eapteka) {
    next.projects.eapteka = createProjectTemplate("eapteka", "Eapteka");
    next.projects.eapteka.materialsFolder = "eapteka";
    next.projects.eapteka.heroVideoSrc = "/materials/eapteka/sber_eapteka_hero.mp4";
  }

  const eaptekaFallbackKey =
    (eaptekaByFolder && eaptekaByFolder !== "eapteka" ? eaptekaByFolder : null) ??
    (eaptekaByTitle && eaptekaByTitle !== "eapteka" ? eaptekaByTitle : null) ??
    (eaptekaByAlias && eaptekaByAlias !== "eapteka" ? eaptekaByAlias : null);
  if (next.projects.eapteka && eaptekaFallbackKey && eaptekaFallbackKey !== "eapteka") {
    const current = next.projects.eapteka;
    const candidate = next.projects[eaptekaFallbackKey];
    if (candidate && projectContentScore(candidate) > projectContentScore(current)) {
      next.projects.eapteka = candidate;
      delete next.projects[eaptekaFallbackKey];
    }
  }

  const eaptekaCandidateEntries = Object.entries(next.projects).filter(([key, project]) => isEaptekaLikeProject(key, project));
  if (eaptekaCandidateEntries.length > 0) {
    let bestKey = eaptekaCandidateEntries[0][0];
    let bestProject = eaptekaCandidateEntries[0][1];
    for (const [key, project] of eaptekaCandidateEntries.slice(1)) {
      if (projectContentScore(project) > projectContentScore(bestProject)) {
        bestKey = key;
        bestProject = project;
      }
    }
    next.projects.eapteka = bestProject;
    for (const [key] of eaptekaCandidateEntries) {
      if (key !== "eapteka" && key !== bestKey) {
        delete next.projects[key];
      }
    }
    if (bestKey !== "eapteka") {
      delete next.projects[bestKey];
    }
  }

  const hasEaptekaCard = next.home.projects.some((card) => hrefToProjectSlug(card.href) === "eapteka");
  if (!hasEaptekaCard) {
    next.home.projects.push({
      id: nextHomeCardId(next.home.projects),
      title: "EAPTEKA",
      shape: "landscape",
      tone: "mint",
      href: "/projects/eapteka",
      thumbnailSrc: EAPTEKA_THUMBNAIL_SRC,
    });
  }

  next.home.projects = next.home.projects.map((card) => {
    if (card.href === "/projects/eapteka") {
      return {
        ...card,
        title: "EAPTEKA",
        shape: "landscape",
        tone: "mint",
        thumbnailSrc: EAPTEKA_THUMBNAIL_SRC,
      };
    }
    const existingSlug = hrefToProjectSlug(card.href);
    const fallbackSlug = canonicalProjectSlug(card.title) || `project-${canonicalProjectSlug(card.id) || "card"}`;
    const slug = canonicalProjectSlug(existingSlug || fallbackSlug);
    const resolvedKey = resolveProjectKeyBySlug(next.projects, slug);
    if (!resolvedKey) {
      next.projects[slug] = createProjectTemplate(slug, card.title);
    }
    const ensuredKey = resolvedKey ?? slug;
    const hrefSlug = keyToSlug(ensuredKey);
    const folderForThumb =
      sanitizeProjectKey(next.projects[ensuredKey]?.materialsFolder ?? "") || sanitizeProjectKey(keyToSlug(ensuredKey));
    const shouldNormalizeNeoTitle =
      card.id === "p1" ||
      normalizeLookup(card.title) === "vkheo" ||
      normalizeLookup(card.title) === "vkneo" ||
      normalizeLookup(slug) === "vkneo";
    const isSobchakCard = card.id === "p5" || card.title.toLowerCase().includes("собчак");
    const isUralsibCard =
      card.id === "p6" || normalizeLookup(card.title).includes("uralsib") || card.title.toLowerCase().includes("уралсиб");
    const forcedThumb = isSobchakCard ? THUMB_BY_FOLDER.sobchak : isUralsibCard ? THUMB_BY_FOLDER.uralsib : undefined;

    return {
      ...card,
      ...(shouldNormalizeNeoTitle ? { title: "VK / NEO" } : {}),
      href: isSobchakCard ? "/projects/sobchak" : isUralsibCard ? "/projects/uralsib" : `/projects/${hrefSlug}`,
      thumbnailSrc:
        normalizeAssetPath(card.thumbnailSrc, folderForThumb) || forcedThumb || THUMB_BY_FOLDER[folderForThumb] || card.thumbnailSrc,
    };
  });

  const eaptekaIndex = next.home.projects.findIndex((card) => card.href === "/projects/eapteka");
  const mtsIndex = next.home.projects.findIndex(
    (card) =>
      card.id === "p2" || normalizeLookup(card.title).includes("nikusay") || card.title.toLowerCase().includes("никусай")
  );
  if (eaptekaIndex >= 0 && mtsIndex >= 0 && eaptekaIndex !== mtsIndex) {
    const temp = next.home.projects[eaptekaIndex];
    next.home.projects[eaptekaIndex] = next.home.projects[mtsIndex];
    next.home.projects[mtsIndex] = temp;
  }

  const eaptekaCard = next.home.projects.find((card) => card.href === "/projects/eapteka");
  if (eaptekaCard?.layout && eaptekaCard.layout.width < 27) {
    delete eaptekaCard.layout;
  }

  for (const key of Object.keys(next.projects)) {
    const folder = sanitizeProjectKey(next.projects[key].materialsFolder ?? "") || sanitizeProjectKey(keyToSlug(key));
    if (!next.projects[key].heroVideoSrc && HERO_BY_FOLDER[folder]) {
      next.projects[key].heroVideoSrc = HERO_BY_FOLDER[folder];
    }
  }

  if (typeof next.home.mottoText !== "string") {
    next.home.mottoText = cloneDefaultContent().home.mottoText ?? "";
  }
  const cardIdSet = new Set(next.home.projects.map((card) => card.id));
  const normalizedRows = Array.isArray(next.home.rows)
    ? next.home.rows
      .map((row, index) => {
        const id = typeof row.id === "string" && row.id.trim() ? row.id : `r${index + 1}`;
        const projectIds = Array.isArray(row.projectIds)
          ? row.projectIds.filter((projectId): projectId is string => typeof projectId === "string" && cardIdSet.has(projectId)).slice(0, 3)
          : [];
        return { id, projectIds };
      })
      .filter((row) => row.projectIds.length > 0)
    : [];
  next.home.rows = normalizedRows.length > 0 ? normalizedRows : buildDefaultHomeRowsFromCards(next.home.projects);

  const normalizedStickers = Array.isArray(next.home.stickers)
    ? next.home.stickers
      .map((sticker, index) => {
        if (!sticker || typeof sticker.src !== "string" || !sticker.src.trim()) {
          return null;
        }
        return {
          id: typeof sticker.id === "string" && sticker.id.trim() ? sticker.id : `s${index + 1}`,
          src: sticker.src.trim(),
          alt: typeof sticker.alt === "string" ? sticker.alt : "",
        };
      })
      .filter((item): item is { id: string; src: string; alt: string } => Boolean(item))
    : [];
  next.home.stickers = normalizedStickers.length > 0 ? normalizedStickers : structuredClone(cloneDefaultContent().home.stickers ?? []);

  return next;
}

function blockLabel(block: SectionBlock): string {
  if (block.type === "row") {
    return "media";
  }
  if (block.type === "subheading") {
    return "header";
  }
  return "text";
}

function blockPreview(block: SectionBlock): string {
  if (block.type === "row") {
    const gridSuffix = block.row.layout === "grid-3" ? ` (${block.row.gridCols ?? 3} cols)` : "";
    return `${block.row.layout}${gridSuffix} · ${block.row.items.length} items`;
  }
  return block.text.slice(0, 100);
}

export default function EditorPage() {
  const initial = useMemo(() => {
    const fallback = ensureSpecialPages(ensureHomeProjectLinksAndEntries(cloneDefaultContent()));
    if (Object.keys(fallback.projects).length === 0) {
      fallback.projects["project-1"] = createProjectTemplate("project-1", "New project");
    }
    return fallback;
  }, []);

  const [tab, setTab] = useState<EditorTab>("project");
  const [dragState, setDragState] = useState<DragState>(null);
  const [dropSlot, setDropSlot] = useState<{ key: string; index: number } | null>(null);
  const [importText, setImportText] = useState("");
  const [renameProjectKeyInput, setRenameProjectKeyInput] = useState("");
  const [newProjectKeyInput, setNewProjectKeyInput] = useState("");
  const [newProjectTitleInput, setNewProjectTitleInput] = useState("");
  const [projectMaterials, setProjectMaterials] = useState<string[]>([]);
  const [materialsFolders, setMaterialsFolders] = useState<string[]>([]);
  const [projectMaterialsFolder, setProjectMaterialsFolder] = useState<string | null>(null);
  const [homeCardMaterials, setHomeCardMaterials] = useState<Record<string, string[]>>({});
  const [materialsIndex, setMaterialsIndex] = useState<MaterialsIndex>({ folders: [], byFolder: {} });
  const [content, setContent] = useState<SiteContent>(initial);
  const [projectKey, setProjectKey] = useState<ProjectKey>("project-1");
  const [isHydrated, setIsHydrated] = useState(false);

  const projectKeys = useMemo(() => Object.keys(content.projects), [content.projects]);
  const selectedProjectKey = content.projects[projectKey] ? projectKey : projectKeys[0] ?? "project-1";
  const resolvedProjectKeyBySelection = resolveProjectKeyBySlug(content.projects, keyToSlug(selectedProjectKey));
  const activeProjectKey =
    (resolvedProjectKeyBySelection && content.projects[resolvedProjectKeyBySelection] ? resolvedProjectKeyBySelection : selectedProjectKey) ??
    "project-1";
  const activeSpecialPageKey = isSpecialPageKey(tab) ? tab : null;
  const editableContent = activeSpecialPageKey ? content.specialPages[activeSpecialPageKey] : asProject(content, activeProjectKey);
  const normalizedRenameProjectKey = useMemo(() => sanitizeProjectKey(renameProjectKeyInput), [renameProjectKeyInput]);
  const normalizedNewProjectKey = useMemo(() => sanitizeProjectKey(newProjectKeyInput), [newProjectKeyInput]);
  const canRenameProject =
    normalizedRenameProjectKey.length > 0 &&
    normalizedRenameProjectKey !== activeProjectKey &&
    !projectKeys.includes(normalizedRenameProjectKey);
  const canAddProject = normalizedNewProjectKey.length > 0 && !projectKeys.includes(normalizedNewProjectKey);
  const newProjectTitle = newProjectTitleInput.trim() || normalizedNewProjectKey;
  const selectedMaterialsFolderKey =
    sanitizeProjectKey(editableContent.materialsFolder ?? "") ||
    (activeSpecialPageKey ? sanitizeProjectKey(activeSpecialPageKey) : keyToSlug(activeProjectKey));
  const referenceMode =
    editableContent?.referenceStyle?.mode ??
    (editableContent?.referenceStyle?.useThisStyle
      ? editableContent?.referenceStyle?.useSiteStyle === false
        ? "random"
        : "site"
      : "default");
  const homeRows = content.home.rows ?? [];
  const homeStickers = content.home.stickers ?? [];
  const allStickerSourceOptions = useMemo(() => {
    const media = new Set<string>();
    for (const folder of materialsIndex.folders) {
      for (const src of materialsIndex.byFolder[folder] ?? []) {
        const type = mediaTypeFromSrc(src);
        if (type === "image" || type === "gif" || type === "video") {
          media.add(src);
        }
      }
    }
    return Array.from(media).sort((a, b) => a.localeCompare(b));
  }, [materialsIndex]);

  useEffect(() => {
    let cancelled = false;

    async function refreshIndex() {
      const nextIndex = await loadMaterialsIndex();
      if (cancelled) {
        return;
      }
      setMaterialsIndex((prev) => {
        if (
          prev.generatedAt === nextIndex.generatedAt &&
          prev.folders.length === nextIndex.folders.length &&
          prev.folders.every((folder, index) => folder === nextIndex.folders[index])
        ) {
          return prev;
        }
        return nextIndex;
      });
    }

    void refreshIndex();
    const intervalId = window.setInterval(() => {
      void refreshIndex();
    }, 2000);
    const onFocus = () => {
      void refreshIndex();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  function getEditableDraft(next: SiteContent): ProjectPageContent {
    if (activeSpecialPageKey) {
      return next.specialPages[activeSpecialPageKey];
    }
    return asProject(next, activeProjectKey);
  }

  useEffect(() => {
    const loaded = ensureSpecialPages(ensureHomeProjectLinksAndEntries(loadSiteContent()));
    if (Object.keys(loaded.projects).length === 0) {
      loaded.projects["project-1"] = createProjectTemplate("project-1", "New project");
    }
    const loadedKeys = Object.keys(loaded.projects);
    setContent(loaded);
    setProjectKey((prev) => (loaded.projects[prev] ? prev : (loadedKeys[0] ?? "project-1")));
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    setRenameProjectKeyInput(activeProjectKey);
  }, [activeProjectKey]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    if (window.localStorage.getItem(EAPTEKA_SEEDED_KEY) === "1") {
      return;
    }
    setContent((prev) => {
      const hasCard = prev.home.projects.some((card) => hrefToProjectSlug(card.href) === "eapteka");
      const hasProject = Boolean(prev.projects.eapteka);
      if (hasCard && hasProject) {
        return prev;
      }
      const next = structuredClone(prev);
      if (!hasProject) {
        next.projects.eapteka = createProjectTemplate("eapteka", "Eapteka");
      }
      if (!hasCard) {
        next.home.projects.push({
          id: nextHomeCardId(next.home.projects),
          title: "EAPTEKA",
          shape: "landscape",
          tone: "mint",
          href: "/projects/eapteka",
          thumbnailSrc: EAPTEKA_THUMBNAIL_SRC,
        });
      }
      const normalized = ensureSpecialPages(ensureHomeProjectLinksAndEntries(next));
      saveSiteContent(normalized);
      return normalized;
    });
    window.localStorage.setItem(EAPTEKA_SEEDED_KEY, "1");
  }, [isHydrated]);

  useEffect(() => {
    if (!selectedMaterialsFolderKey) {
      setProjectMaterials([]);
      setProjectMaterialsFolder(null);
      setMaterialsFolders(materialsIndex.folders);
      return;
    }
    const folder = resolveMaterialsFolderName(materialsIndex.folders, selectedMaterialsFolderKey);
    setProjectMaterials(folder ? materialsIndex.byFolder[folder] ?? [] : []);
    setProjectMaterialsFolder(folder);
    setMaterialsFolders(materialsIndex.folders);
  }, [materialsIndex, selectedMaterialsFolderKey]);

  useEffect(() => {
    const cardTargets = content.home.projects
      .map((card) => {
        const slug = hrefToProjectSlug(card.href);
        if (!slug) {
          return null;
        }
        const key = resolveProjectKeyBySlug(content.projects, slug);
        if (!key) {
          return null;
        }
        const linkedProject = content.projects[key];
        const folder = sanitizeProjectKey(linkedProject.materialsFolder ?? "") || keyToSlug(key);
        if (!folder) {
          return null;
        }
        return { cardId: card.id, folder };
      })
      .filter((entry): entry is { cardId: string; folder: string } => Boolean(entry));
    const byFolder: Record<string, string[]> = {};
    const byCard: Record<string, string[]> = {};
    for (const { cardId, folder } of cardTargets) {
      if (!byFolder[folder]) {
        const resolvedFolder = resolveMaterialsFolderName(materialsIndex.folders, folder);
        byFolder[folder] = resolvedFolder ? materialsIndex.byFolder[resolvedFolder] ?? [] : [];
      }
      byCard[cardId] = byFolder[folder] ?? [];
    }
    setHomeCardMaterials(byCard);
  }, [content.home.projects, content.projects, materialsIndex]);

  function commit(updater: (draft: SiteContent) => void) {
    setContent((prev) => {
      const next = structuredClone(prev);
      updater(next);
      const normalized = ensureSpecialPages(ensureHomeProjectLinksAndEntries(next));
      saveSiteContent(normalized);
      return normalized;
    });
  }

  function onDragStart(listKey: string, index: number) {
    setDragState({ listKey, index });
  }

  function startDrag(event: DragEvent<HTMLElement>, listKey: string, index: number) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${listKey}:${index}`);
    onDragStart(listKey, index);
  }

  function onDrop(listKey: string, index: number, onMove: (from: number, to: number) => void) {
    if (!dragState || dragState.listKey !== listKey) {
      return;
    }
    if (dragState.index !== index) {
      onMove(dragState.index, index);
    }
    setDragState(null);
    setDropSlot(null);
  }

  function moveInList(listKey: string, index: number, delta: number, onMove: (from: number, to: number) => void) {
    const nextIndex = index + delta;
    if (nextIndex < 0) {
      return;
    }
    onMove(index, nextIndex);
    setDragState({ listKey, index: nextIndex });
  }

  function onSlotDragOver(event: DragEvent<HTMLElement>, listKey: string, slotIndex: number) {
    event.preventDefault();
    if (!dragState) {
      return;
    }
    const isSameList = dragState.listKey === listKey;
    const fromSectionBlocks = parseSectionBlocksListKey(dragState.listKey);
    const toSectionBlocks = parseSectionBlocksListKey(listKey);
    const isCrossSectionBlocksMove = Boolean(fromSectionBlocks && toSectionBlocks);
    if (!isSameList && !isCrossSectionBlocksMove) {
      return;
    }
    setDropSlot({ key: listKey, index: slotIndex });
  }

  function onSlotDrop(
    listKey: string,
    slotIndex: number,
    onMove: (from: number, to: number, fromListKey: string, toListKey: string) => void
  ) {
    if (!dragState) {
      return;
    }
    const isSameList = dragState.listKey === listKey;
    const fromSectionBlocks = parseSectionBlocksListKey(dragState.listKey);
    const toSectionBlocks = parseSectionBlocksListKey(listKey);
    const isCrossSectionBlocksMove = Boolean(fromSectionBlocks && toSectionBlocks);
    if (!isSameList && !isCrossSectionBlocksMove) {
      return;
    }
    let to = slotIndex;
    if (isSameList && to > dragState.index) {
      to -= 1;
    }
    if (to < 0) {
      to = 0;
    }
    onMove(dragState.index, to, dragState.listKey, listKey);
    setDragState(null);
    setDropSlot(null);
  }

  const exportJson = useMemo(() => JSON.stringify(content, null, 2), [content]);

  return (
    <main className="editor-page">
      <header className="editor-head">
        <h1>Lastik Content Editor</h1>
        <p>Редактор структуры: порядок, тексты и медиа. Стиль и вёрстка на страницах остаются отдельно.</p>
        <div className="editor-actions">
          <button onClick={() => saveSiteContent(content)} type="button">
            Save
          </button>
          <button
            onClick={() => {
              const next = ensureSpecialPages(ensureHomeProjectLinksAndEntries(resetSiteContent()));
              if (Object.keys(next.projects).length === 0) {
                next.projects["project-1"] = createProjectTemplate("project-1", "New project");
              }
              setContent(next);
              saveSiteContent(next);
              setProjectKey(Object.keys(next.projects)[0] ?? "project-1");
            }}
            type="button"
          >
            Reset
          </button>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(exportJson);
            }}
            type="button"
          >
            Copy JSON
          </button>
        </div>
      </header>

      <nav className="editor-tabs" aria-label="Editor sections">
        <button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")} type="button">
          Home
        </button>
        <button className={tab === "project" ? "active" : ""} onClick={() => setTab("project")} type="button">
          Projects
        </button>
        <button className={tab === "artdirCourse" ? "active" : ""} onClick={() => setTab("artdirCourse")} type="button">
          Артдир курс
        </button>
        <button className={tab === "studio" ? "active" : ""} onClick={() => setTab("studio")} type="button">
          Студия
        </button>
        <button className={tab === "contacts" ? "active" : ""} onClick={() => setTab("contacts")} type="button">
          Контакты
        </button>
      </nav>

      {tab === "home" ? (
        <section className="editor-section">
          <h2>Home Content</h2>
          <label>
            Hero title
            <input
              value={content.home.heroTitle}
              onChange={(e) =>
                commit((next) => {
                  next.home.heroTitle = e.target.value;
                })
              }
            />
          </label>
          <label>
            Motto text
            <input
              value={content.home.mottoText ?? ""}
              onChange={(e) =>
                commit((next) => {
                  next.home.mottoText = e.target.value;
                })
              }
            />
          </label>
          <label>
            Footer text
            <input
              value={content.home.footerText}
              onChange={(e) =>
                commit((next) => {
                  next.home.footerText = e.target.value;
                })
              }
            />
          </label>
          <label>
            Global ref-site URL
            <input
              placeholder="https://example.com"
              value={content.home.referenceSiteUrl ?? ""}
              onChange={(e) =>
                commit((next) => {
                  next.home.referenceSiteUrl = e.target.value;
                })
              }
            />
          </label>

          <h3>Projects order</h3>
          <div className="editor-list">
            {content.home.projects.map((projectCard, index) => {
              const linkedMaterials = homeCardMaterials[projectCard.id] ?? [];
              const thumbnailOptions = linkedMaterials.filter((src) => {
                const type = mediaTypeFromSrc(src);
                return type === "image" || type === "gif" || type === "video";
              });
              const selectedThumbnail =
                projectCard.thumbnailSrc && thumbnailOptions.includes(projectCard.thumbnailSrc) ? projectCard.thumbnailSrc : "";

              return (
                <article
                  key={projectCard.id}
                  className="editor-item"
                  draggable
                  onDragStart={(e) => startDrag(e, "home.projects", index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() =>
                    onDrop("home.projects", index, (from, to) =>
                      commit((next) => {
                        next.home.projects = reorder(next.home.projects, from, to);
                      })
                    )
                  }
                >
                  <div className="editor-item-head">
                    <strong>{projectCard.id}</strong>
                    <div className="editor-mini-actions">
                      <button
                        type="button"
                        onClick={() =>
                          moveInList("home.projects", index, -1, (from, to) =>
                            commit((next) => {
                              if (to >= 0) {
                                next.home.projects = reorder(next.home.projects, from, to);
                              }
                            })
                          )
                        }
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          moveInList("home.projects", index, 1, (from, to) =>
                            commit((next) => {
                              if (to < next.home.projects.length) {
                                next.home.projects = reorder(next.home.projects, from, to);
                              }
                            })
                          )
                        }
                      >
                        ↓
                      </button>
                    </div>
                  </div>

                  <label>
                    Title
                    <input
                      value={projectCard.title}
                      onChange={(e) =>
                        commit((next) => {
                          next.home.projects[index].title = e.target.value;
                        })
                      }
                    />
                  </label>

                  <label>
                    Link
                    <input
                      placeholder="/projects/..."
                      value={projectCard.href ?? ""}
                      onChange={(e) =>
                        commit((next) => {
                          next.home.projects[index].href = e.target.value || undefined;
                        })
                      }
                    />
                  </label>

                  <label>
                    Thumbnail src
                    <input
                      placeholder="/materials/.../thumb.png"
                      value={projectCard.thumbnailSrc ?? ""}
                      onChange={(e) =>
                        commit((next) => {
                          const slug = hrefToProjectSlug(next.home.projects[index].href) ?? "";
                          const key = slug ? resolveProjectKeyBySlug(next.projects, slug) : null;
                          const folder =
                            (key && (sanitizeProjectKey(next.projects[key].materialsFolder ?? "") || sanitizeProjectKey(key))) || undefined;
                          next.home.projects[index].thumbnailSrc = normalizeAssetPath(e.target.value, folder);
                        })
                      }
                    />
                  </label>

                  {thumbnailOptions.length > 0 ? (
                    <label>
                      Thumbnail from linked project materials
                      <select
                        value={selectedThumbnail}
                        onChange={(e) =>
                          commit((next) => {
                            next.home.projects[index].thumbnailSrc = e.target.value || undefined;
                          })
                        }
                      >
                        <option value="">(none)</option>
                        {thumbnailOptions.map((src) => (
                          <option key={`${projectCard.id}-${src}`} value={src}>
                            {src}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <div className="editor-grid-2">
                    <label>
                      Shape
                      <select
                        value={projectCard.shape}
                        onChange={(e) =>
                          commit((next) => {
                            next.home.projects[index].shape = e.target.value as SiteContent["home"]["projects"][number]["shape"];
                          })
                        }
                      >
                        <option value="landscape">landscape</option>
                        <option value="portrait">portrait</option>
                        <option value="tall">tall</option>
                        <option value="square">square</option>
                      </select>
                    </label>

                    <label>
                      Tone
                      <select
                        value={projectCard.tone}
                        onChange={(e) =>
                          commit((next) => {
                            next.home.projects[index].tone = e.target.value as SiteContent["home"]["projects"][number]["tone"];
                          })
                        }
                      >
                        <option value="neo">neo</option>
                        <option value="anime">anime</option>
                        <option value="aqua">aqua</option>
                        <option value="sky">sky</option>
                        <option value="flat">flat</option>
                        <option value="night">night</option>
                        <option value="mint">mint</option>
                        <option value="lime">lime</option>
                        <option value="ice">ice</option>
                        <option value="peach">peach</option>
                      </select>
                    </label>
                  </div>
                </article>
              );
            })}
          </div>

          <h3>Rows (1-3 projects per row)</h3>
          <div className="editor-list">
            {homeRows.map((row, rowIndex) => (
              <article className="editor-item" key={row.id}>
                <div className="editor-item-head">
                  <strong>{row.id}</strong>
                  <div className="editor-mini-actions">
                    <button
                      type="button"
                      onClick={() =>
                        moveInList("home.rows", rowIndex, -1, (from, to) =>
                          commit((next) => {
                            if (to >= 0) {
                              next.home.rows = reorder(next.home.rows ?? [], from, to);
                            }
                          })
                        )
                      }
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        moveInList("home.rows", rowIndex, 1, (from, to) =>
                          commit((next) => {
                            if (to < (next.home.rows ?? []).length) {
                              next.home.rows = reorder(next.home.rows ?? [], from, to);
                            }
                          })
                        )
                      }
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        commit((next) => {
                          const rows = next.home.rows ?? [];
                          rows.splice(rowIndex, 1);
                          next.home.rows = rows.length > 0 ? rows : buildDefaultHomeRowsFromCards(next.home.projects);
                        })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="editor-grid-3">
                  {[0, 1, 2].map((slot) => (
                    <label key={`${row.id}-slot-${slot}`}>
                      Project {slot + 1}
                      <select
                        value={row.projectIds[slot] ?? ""}
                        onChange={(e) =>
                          commit((next) => {
                            const rows = next.home.rows ?? [];
                            const target = rows[rowIndex];
                            if (!target) {
                              return;
                            }
                            const current = [...target.projectIds];
                            if (!e.target.value) {
                              if (slot < current.length) {
                                current.splice(slot, 1);
                              }
                            } else if (slot < current.length) {
                              current[slot] = e.target.value;
                            } else {
                              while (current.length < slot) {
                                current.push("");
                              }
                              current.push(e.target.value);
                            }
                            target.projectIds = current.filter(Boolean).slice(0, 3);
                            next.home.rows = rows;
                          })
                        }
                      >
                        <option value="">(empty)</option>
                        {content.home.projects.map((card) => (
                          <option key={`${row.id}-slot-${slot}-${card.id}`} value={card.id}>
                            {card.id} - {card.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="editor-actions">
            <button
              type="button"
              onClick={() =>
                commit((next) => {
                  const rows = next.home.rows ?? [];
                  const unassigned = next.home.projects
                    .map((card) => card.id)
                    .filter((id) => !rows.some((row) => row.projectIds.includes(id)));
                  rows.push({
                    id: nextHomeRowId(rows),
                    projectIds: unassigned.slice(0, 3),
                  });
                  next.home.rows = rows;
                })
              }
            >
              Add row
            </button>
            <button
              type="button"
              onClick={() =>
                commit((next) => {
                  next.home.rows = buildDefaultHomeRowsFromCards(next.home.projects);
                })
              }
            >
              Auto-build rows
            </button>
          </div>

          <h3>Sticker column</h3>
          <div className="editor-actions">
            <button
              type="button"
              onClick={async () => {
                const payload = await loadMaterialsIndex();
                setMaterialsIndex(payload);
              }}
            >
              Refresh material folders
            </button>
          </div>
          <div className="editor-list">
            {homeStickers.map((sticker, stickerIndex) => (
              <article className="editor-item" key={sticker.id}>
                <div className="editor-item-head">
                  <strong>{sticker.id}</strong>
                  <div className="editor-mini-actions">
                    <button
                      type="button"
                      onClick={() =>
                        moveInList("home.stickers", stickerIndex, -1, (from, to) =>
                          commit((next) => {
                            if (to >= 0) {
                              next.home.stickers = reorder(next.home.stickers ?? [], from, to);
                            }
                          })
                        )
                      }
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        moveInList("home.stickers", stickerIndex, 1, (from, to) =>
                          commit((next) => {
                            if (to < (next.home.stickers ?? []).length) {
                              next.home.stickers = reorder(next.home.stickers ?? [], from, to);
                            }
                          })
                        )
                      }
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        commit((next) => {
                          const stickers = next.home.stickers ?? [];
                          stickers.splice(stickerIndex, 1);
                          next.home.stickers = stickers;
                        })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <label>
                  Sticker src
                  <input
                    placeholder="/materials/.../thumb.png"
                    value={sticker.src}
                    onChange={(e) =>
                      commit((next) => {
                        const target = (next.home.stickers ?? [])[stickerIndex];
                        if (target) {
                          target.src = e.target.value;
                        }
                      })
                    }
                  />
                </label>
                <label>
                  Sticker from all materials
                  <select
                    value={allStickerSourceOptions.includes(sticker.src) ? sticker.src : ""}
                    onChange={(e) =>
                      commit((next) => {
                        const target = (next.home.stickers ?? [])[stickerIndex];
                        if (target && e.target.value) {
                          target.src = e.target.value;
                        }
                      })
                    }
                  >
                    <option value="">Select file...</option>
                    {allStickerSourceOptions.map((src) => (
                      <option key={`${sticker.id}-${src}`} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Alt text
                  <input
                    value={sticker.alt ?? ""}
                    onChange={(e) =>
                      commit((next) => {
                        const target = (next.home.stickers ?? [])[stickerIndex];
                        if (target) {
                          target.alt = e.target.value;
                        }
                      })
                    }
                  />
                </label>
              </article>
            ))}
          </div>
          <div className="editor-actions">
            <button
              type="button"
              onClick={() =>
                commit((next) => {
                  const stickers = next.home.stickers ?? [];
                  const randomThumb = next.home.projects.find((card) => card.thumbnailSrc)?.thumbnailSrc ?? "";
                  stickers.push({
                    id: nextHomeStickerId(stickers),
                    src: randomThumb,
                    alt: "Sticker",
                  });
                  next.home.stickers = stickers;
                })
              }
            >
              Add sticker
            </button>
            <button
              type="button"
              onClick={() =>
                commit((next) => {
                  next.home.stickers = next.home.projects
                    .filter((card) => card.thumbnailSrc)
                    .slice(0, 10)
                    .map((card, index) => ({
                      id: `s${index + 1}`,
                      src: card.thumbnailSrc ?? "",
                      alt: card.title,
                    }));
                })
              }
            >
              Generate from project thumbs
            </button>
          </div>
        </section>
      ) : (
        <section className="editor-section">
          <h2>{tab === "project" ? "Project Content" : "Page Content"}</h2>

          {tab === "project" ? (
            <>
              <label>
                Project
                <select value={activeProjectKey} onChange={(e) => setProjectKey(e.target.value)}>
                  {projectKeys.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </label>
          <div className="editor-grid-2">
            <label>
              Project key
              <input value={renameProjectKeyInput} onChange={(e) => setRenameProjectKeyInput(e.target.value)} />
            </label>
            <label>
              Rename key
              <button
                type="button"
                disabled={!canRenameProject}
                onClick={async () => {
                  const fromKey = activeProjectKey;
                  const toKey = normalizedRenameProjectKey;
                  if (!toKey || fromKey === toKey || projectKeys.includes(toKey)) {
                    return;
                  }

                  const fromFolder = sanitizeProjectKey(editableContent.materialsFolder ?? "") || keyToSlug(fromKey);
                  const toFolder = sanitizeProjectKey(toKey);

                  const fromSlugLookup = normalizeLookup(keyToSlug(fromKey));
                  const toSlug = keyToSlug(toKey);
                  commit((next) => {
                    const moving = next.projects[fromKey];
                    if (!moving) {
                      return;
                    }
                    next.projects[toKey] = moving;
                    delete next.projects[fromKey];
                    next.projects[toKey].materialsFolder = fromFolder || toFolder || undefined;
                    next.home.projects = next.home.projects.map((card) => {
                      const slug = hrefToProjectSlug(card.href);
                      if (slug && normalizeLookup(slug) === fromSlugLookup) {
                        return { ...card, href: `/projects/${toSlug}` };
                      }
                      return card;
                    });
                  });
                  setProjectKey(toKey);
                  setRenameProjectKeyInput(toKey);
                }}
              >
                Rename
              </button>
            </label>
          </div>
          <div className="editor-grid-2">
            <label>
              New project key
              <input
                placeholder="новый проектик"
                value={newProjectKeyInput}
                onChange={(e) => setNewProjectKeyInput(e.target.value)}
              />
            </label>
            <label>
              New project title
              <input
                placeholder="новый проектик"
                value={newProjectTitleInput}
                onChange={(e) => setNewProjectTitleInput(e.target.value)}
              />
            </label>
          </div>
          <div className="editor-actions">
            <button
              type="button"
              onClick={async () => {
                const payload = await loadMaterialsIndex();
                setMaterialsIndex(payload);
              }}
            >
              Refresh material folders
            </button>
            <button
              type="button"
              disabled={!canAddProject}
              onClick={async () => {
                const nextKey = normalizedNewProjectKey;
                if (!nextKey || projectKeys.includes(nextKey)) {
                  return;
                }
                commit((next) => {
                  next.projects[nextKey] = createProjectTemplate(nextKey, newProjectTitle);
                  next.home.projects.push({
                    id: nextHomeCardId(next.home.projects),
                    title: newProjectTitle || nextKey,
                    shape: "landscape",
                    tone: "sky",
                    href: `/projects/${nextKey}`,
                    layout: randomHomeCardLayout(),
                  });
                });
                setProjectKey(nextKey);
                setNewProjectKeyInput("");
                setNewProjectTitleInput("");
              }}
            >
              Add project
            </button>
            <button
              type="button"
              disabled={projectKeys.length <= 1}
              onClick={() => {
                if (projectKeys.length <= 1) {
                  return;
                }
                const keyToDelete = activeProjectKey;
                const firstConfirm = window.confirm(`Точно удалить проект "${keyToDelete}"?`);
                if (!firstConfirm) {
                  return;
                }
                const secondConfirm = window.confirm("Подтверди еще раз: удалить проект безвозвратно?");
                if (!secondConfirm) {
                  return;
                }
                const fallbackKey = projectKeys.find((key) => key !== keyToDelete) ?? "project-1";
                commit((next) => {
                  delete next.projects[keyToDelete];
                  next.home.projects = next.home.projects.filter((card) => {
                    const slug = hrefToProjectSlug(card.href);
                    if (!slug) {
                      return true;
                    }
                    if (normalizeLookup(slug) === normalizeLookup(keyToSlug(keyToDelete))) {
                      return false;
                    }
                    const resolved = resolveProjectKeyBySlug(next.projects, slug);
                    return resolved !== keyToDelete;
                  });
                });
                setProjectKey(fallbackKey);
              }}
            >
              Delete project
            </button>
          </div>
            </>
          ) : null}
          <label>
            Materials folder
            <select
              value={editableContent.materialsFolder ?? ""}
              onChange={(e) =>
                commit((next) => {
                  const target = getEditableDraft(next);
                  target.materialsFolder = e.target.value || undefined;
                })
              }
            >
              <option value="">{`Auto (${activeSpecialPageKey ? sanitizeProjectKey(activeSpecialPageKey) : keyToSlug(activeProjectKey)})`}</option>
              {editableContent.materialsFolder && !materialsFolders.includes(editableContent.materialsFolder) ? (
                <option value={editableContent.materialsFolder}>{editableContent.materialsFolder}</option>
              ) : null}
              {materialsFolders.map((folder) => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
            </select>
          </label>
          <p className="editor-note">
            Materials folder: {projectMaterialsFolder ? `/public/materials/${projectMaterialsFolder}` : "not found yet"}
          </p>
          <details className="editor-item">
            <summary>
              Available materials ({projectMaterials.length})
            </summary>
            {projectMaterials.length > 0 ? (
              <div className="editor-list">
                {projectMaterials.map((src) => (
                  <label key={`material-${src}`}>
                    File
                    <input
                      readOnly
                      value={src}
                      onFocus={(e) => e.target.select()}
                    />
                  </label>
                ))}
              </div>
            ) : (
              <p className="editor-note">No files loaded for this materials folder.</p>
            )}
          </details>

          <div className="editor-grid-2">
            <label>
              Back label
              <input
                value={editableContent.backLabel}
                onChange={(e) =>
                  commit((next) => {
                    getEditableDraft(next).backLabel = e.target.value;
                  })
                }
              />
            </label>
            <label>
              Page title
              <input
                value={editableContent.title}
                onChange={(e) =>
                  commit((next) => {
                    getEditableDraft(next).title = e.target.value;
                  })
                }
              />
            </label>
          </div>
          <label>
            Tags
            <div className="editor-tag-grid">
              {EDITOR_TAGS.map((tag) => {
                const checked = (editableContent.tags ?? []).includes(tag);
                return (
                  <label className="editor-inline" key={`tag-${tag}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        commit((next) => {
                          const target = getEditableDraft(next);
                          const prev = target.tags ?? [];
                          if (e.target.checked) {
                            target.tags = Array.from(new Set([...prev, tag]));
                          } else {
                            target.tags = prev.filter((item) => item !== tag);
                          }
                        })
                      }
                    />
                    {tag.toUpperCase()}
                  </label>
                );
              })}
            </div>
          </label>

          <h3>Reference Style</h3>
          <label>
            Style mode
            <select
              value={referenceMode}
              onChange={(e) =>
                commit((next) => {
                  const target = getEditableDraft(next);
                  const nextMode = e.target.value as "default" | "site" | "random";
                  target.referenceStyle = {
                    siteUrl: target.referenceStyle?.siteUrl ?? "",
                    styleName: nextMode === "site" ? "" : target.referenceStyle?.styleName ?? "",
                    mode: nextMode,
                    useThisStyle: nextMode !== "default",
                    useSiteStyle: nextMode === "site",
                  };
                })
              }
            >
              <option value="default">Default</option>
              <option value="site">Reference site</option>
              <option value="random">Randomizer</option>
            </select>
          </label>
          <label>
            Reference site URL
            <input
              placeholder="https://example.com"
              value={editableContent.referenceStyle?.siteUrl ?? ""}
              onChange={(e) =>
                commit((next) => {
                  const target = getEditableDraft(next);
                  target.referenceStyle = {
                    siteUrl: e.target.value,
                    styleName: target.referenceStyle?.styleName ?? "",
                    mode: "site",
                    useThisStyle: true,
                    useSiteStyle: true,
                  };
                })
              }
            />
          </label>
          <label>
            Style name (3 words)
            <input
              placeholder="neon grid theory"
              value={editableContent.referenceStyle?.styleName ?? ""}
              disabled={referenceMode !== "random"}
              onChange={(e) =>
                commit((next) => {
                  const target = getEditableDraft(next);
                  target.referenceStyle = {
                    siteUrl: target.referenceStyle?.siteUrl ?? "",
                    styleName: e.target.value,
                    mode: referenceMode,
                    useThisStyle: referenceMode !== "default",
                    useSiteStyle: referenceMode === "site",
                  };
                })
              }
            />
          </label>
          <div className="editor-actions">
            <button
              type="button"
              disabled={referenceMode !== "random"}
              onClick={() =>
                commit((next) => {
                  const target = getEditableDraft(next);
                  target.referenceStyle = {
                    siteUrl: target.referenceStyle?.siteUrl ?? "",
                    styleName: generateRandomStyleName(),
                    mode: "random",
                    useThisStyle: true,
                    useSiteStyle: false,
                  };
                })
              }
            >
              Generate random style name
            </button>
          </div>

          <div className="editor-grid-2">
            <label>
              Hero video src
              <input
                value={editableContent.heroVideoSrc ?? ""}
                onChange={(e) =>
                  commit((next) => {
                    getEditableDraft(next).heroVideoSrc = normalizeAssetPath(e.target.value, selectedMaterialsFolderKey);
                  })
                }
              />
            </label>
            <label>
              Hero poster src
              <input
                value={editableContent.heroPoster ?? ""}
                onChange={(e) =>
                  commit((next) => {
                    getEditableDraft(next).heroPoster = normalizeAssetPath(e.target.value, selectedMaterialsFolderKey);
                  })
                }
              />
            </label>
          </div>
          <div className="editor-grid-2">
            <label>
              Hero video from project materials
              <select
                value={projectMaterials.includes(editableContent.heroVideoSrc ?? "") ? (editableContent.heroVideoSrc ?? "") : ""}
                onChange={(e) =>
                  commit((next) => {
                    getEditableDraft(next).heroVideoSrc = e.target.value || undefined;
                  })
                }
              >
                <option value="">Select file...</option>
                {projectMaterials
                  .filter((src) => mediaTypeFromSrc(src) === "video")
                  .map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Hero poster from project materials
              <select
                value={projectMaterials.includes(editableContent.heroPoster ?? "") ? (editableContent.heroPoster ?? "") : ""}
                onChange={(e) =>
                  commit((next) => {
                    getEditableDraft(next).heroPoster = e.target.value || undefined;
                  })
                }
              >
                <option value="">Select file...</option>
                {projectMaterials
                  .filter((src) => mediaTypeFromSrc(src) === "image" || mediaTypeFromSrc(src) === "gif")
                  .map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <h3>Intro text blocks</h3>
          <div className="editor-list">
            {editableContent.introTexts.map((text, index) => (
              <article
                className="editor-item"
                key={`intro-${index}`}
                draggable
                onDragStart={(e) => startDrag(e, "project.intro", index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() =>
                  onDrop("project.intro", index, (from, to) =>
                    commit((next) => {
                      getEditableDraft(next).introTexts = reorder(getEditableDraft(next).introTexts, from, to);
                    })
                  )
                }
              >
                <div className="editor-item-head">
                  <strong>Intro {index + 1}</strong>
                  <div className="editor-mini-actions">
                    <button
                      type="button"
                      onClick={() =>
                        moveInList("project.intro", index, -1, (from, to) =>
                          commit((next) => {
                            if (to >= 0) {
                              getEditableDraft(next).introTexts = reorder(getEditableDraft(next).introTexts, from, to);
                            }
                          })
                        )
                      }
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        moveInList("project.intro", index, 1, (from, to) =>
                          commit((next) => {
                            if (to < getEditableDraft(next).introTexts.length) {
                              getEditableDraft(next).introTexts = reorder(getEditableDraft(next).introTexts, from, to);
                            }
                          })
                        )
                      }
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        commit((next) => {
                          getEditableDraft(next).introTexts.splice(index, 1);
                        })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <textarea
                  value={text}
                  onChange={(e) =>
                    commit((next) => {
                      getEditableDraft(next).introTexts[index] = e.target.value;
                    })
                  }
                  rows={3}
                />
              </article>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              commit((next) => {
                getEditableDraft(next).introTexts.push("New intro text");
              })
            }
          >
            Add intro text
          </button>

          <h3>Sections</h3>
          <div className="editor-list">
            {editableContent.sections.map((section, sectionIndex) => (
              <details
                className="editor-item editor-section-card"
                key={section.id}
                draggable
                open
                onDragStart={(e) => startDrag(e, "project.sections", sectionIndex)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() =>
                  onDrop("project.sections", sectionIndex, (from, to) =>
                    commit((next) => {
                      getEditableDraft(next).sections = reorder(getEditableDraft(next).sections, from, to);
                    })
                  )
                }
              >
                <summary>
                  <input
                    value={section.header ?? section.title ?? ""}
                    placeholder="Section header"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      commit((next) => {
                        const nextSection = getEditableDraft(next).sections[sectionIndex];
                        nextSection.header = e.target.value;
                        nextSection.title = e.target.value;
                      })
                    }
                  />
                  <div className="editor-mini-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() =>
                        moveInList("project.sections", sectionIndex, -1, (from, to) =>
                          commit((next) => {
                            if (to >= 0) {
                              getEditableDraft(next).sections = reorder(getEditableDraft(next).sections, from, to);
                            }
                          })
                        )
                      }
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        moveInList("project.sections", sectionIndex, 1, (from, to) =>
                          commit((next) => {
                            if (to < getEditableDraft(next).sections.length) {
                              getEditableDraft(next).sections = reorder(getEditableDraft(next).sections, from, to);
                            }
                          })
                        )
                      }
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        commit((next) => {
                          getEditableDraft(next).sections.splice(sectionIndex, 1);
                        })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </summary>

                <label>
                  Header
                  <input
                    value={section.header ?? section.title ?? ""}
                    onChange={(e) =>
                      commit((next) => {
                        const nextSection = getEditableDraft(next).sections[sectionIndex];
                        nextSection.header = e.target.value;
                        nextSection.title = e.target.value;
                      })
                    }
                  />
                </label>

                <label>
                  About
                  <textarea
                    rows={3}
                    value={section.about ?? ""}
                    onChange={(e) =>
                      commit((next) => {
                        getEditableDraft(next).sections[sectionIndex].about = e.target.value;
                      })
                    }
                  />
                </label>

                <h4>Section blocks</h4>
                <div className="editor-list">
                  <div
                    className={`editor-drop-slot ${
                      dropSlot?.key === `project.section.${sectionIndex}.blocks` && dropSlot.index === 0 ? "active" : ""
                    }`}
                    onDragOver={(e) => onSlotDragOver(e, `project.section.${sectionIndex}.blocks`, 0)}
                    onDrop={() =>
                      onSlotDrop(`project.section.${sectionIndex}.blocks`, 0, (from, to, fromListKey, toListKey) =>
                        commit((next) => {
                          const fromMeta = parseSectionBlocksListKey(fromListKey);
                          const toMeta = parseSectionBlocksListKey(toListKey);
                          if (!fromMeta || !toMeta) {
                            return;
                          }
                          const allSections = getEditableDraft(next).sections;
                          const fromSection = allSections[fromMeta.sectionIndex];
                          const toSection = allSections[toMeta.sectionIndex];
                          if (!fromSection || !toSection) {
                            return;
                          }
                          if (fromMeta.sectionIndex === toMeta.sectionIndex) {
                            toSection.blocks = reorder(toSection.blocks, from, to);
                            return;
                          }
                          const [moved] = fromSection.blocks.splice(from, 1);
                          if (!moved) {
                            return;
                          }
                          const boundedTo = Math.max(0, Math.min(to, toSection.blocks.length));
                          toSection.blocks.splice(boundedTo, 0, moved);
                        })
                      )
                    }
                  />
                  {section.blocks.map((block, blockIndex) => {
                    const blockListKey = `project.section.${sectionIndex}.blocks`;
                    return (
                      <div key={block.id}>
                        <details className="editor-item editor-block-card">
                          <summary className="editor-item-head">
                          <span
                            className="editor-drag-handle"
                            draggable
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDragStart={(e) => {
                              e.stopPropagation();
                              startDrag(e, blockListKey, blockIndex);
                            }}
                            onDragEnd={() => {
                              setDragState(null);
                              setDropSlot(null);
                            }}
                          >
                            ⋮⋮
                          </span>
                          <strong>
                            {blockLabel(block)} · {block.id}
                          </strong>
                          <div className="editor-summary-inline">
                            {block.type === "row" ? (
                              <div className="editor-thumb-strip">
                                {block.row.items.slice(0, 8).map((item) => (
                                  <span className="editor-thumb" key={`${block.id}-thumb-${item.id}`}>
                                    {item.type === "video" ? (
                                      <video autoPlay loop muted playsInline preload="metadata">
                                        <source src={item.src} />
                                      </video>
                                    ) : (
                                      <img src={item.src} alt={item.alt} />
                                    )}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="editor-text-snippet">{blockPreview(block)}</span>
                            )}
                            <div className="editor-mini-actions editor-summary-actions">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  moveInList(blockListKey, blockIndex, -1, (from, to) =>
                                    commit((next) => {
                                      if (to >= 0) {
                                        const nextSection = getEditableDraft(next).sections[sectionIndex];
                                        nextSection.blocks = reorder(nextSection.blocks, from, to);
                                      }
                                    })
                                  );
                                }}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  moveInList(blockListKey, blockIndex, 1, (from, to) =>
                                    commit((next) => {
                                      const nextSection = getEditableDraft(next).sections[sectionIndex];
                                      if (to < nextSection.blocks.length) {
                                        nextSection.blocks = reorder(nextSection.blocks, from, to);
                                      }
                                    })
                                  );
                                }}
                              >
                                ↓
                              </button>
                            </div>
                          </div>
                          </summary>

                          <div className="editor-mini-actions">
                            <button
                              type="button"
                              onClick={() =>
                                commit((next) => {
                                  getEditableDraft(next).sections[sectionIndex].blocks.splice(blockIndex, 1);
                                })
                              }
                            >
                              Delete
                            </button>
                          </div>

                        <label>
                          Block id
                          <input
                            value={block.id}
                            onChange={(e) =>
                              commit((next) => {
                                getEditableDraft(next).sections[sectionIndex].blocks[blockIndex].id = e.target.value;
                              })
                            }
                          />
                        </label>

                        {block.type === "row" ? (
                          <>
                            <div className="editor-grid-2">
                              <label>
                                Layout
                                <select
                                  value={block.row.layout}
                                  onChange={(e) =>
                                    commit((next) => {
                                      const nextBlock = getEditableDraft(next).sections[sectionIndex].blocks[
                                        blockIndex
                                      ] as Extract<SectionBlock, { type: "row" }>;
                                      nextBlock.row.layout = e.target.value as ContentRow["layout"];
                                    })
                                  }
                                >
                                  {rowClassOptions().map((layout) => (
                                    <option key={layout} value={layout}>
                                      {layout}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              {block.row.layout === "grid-3" ? (
                                <label>
                                  Grid density
                                  <select
                                    value={String(block.row.gridCols ?? 3)}
                                    onChange={(e) =>
                                      commit((next) => {
                                        const nextBlock = getEditableDraft(next).sections[sectionIndex].blocks[
                                          blockIndex
                                        ] as Extract<SectionBlock, { type: "row" }>;
                                        const raw = Number(e.target.value);
                                        const cols = Number.isFinite(raw) ? Math.min(6, Math.max(2, Math.round(raw))) : 3;
                                        nextBlock.row.gridCols = cols as 2 | 3 | 4 | 5 | 6;
                                      })
                                    }
                                  >
                                    <option value="2">2 in row</option>
                                    <option value="3">3 in row</option>
                                    <option value="4">4 in row</option>
                                    <option value="5">5 in row</option>
                                    <option value="6">6 in row</option>
                                  </select>
                                </label>
                              ) : null}

                              <label className="editor-inline">
                                <input
                                  checked={Boolean(block.row.equalHeight)}
                                  type="checkbox"
                                  onChange={(e) =>
                                    commit((next) => {
                                      const nextBlock = getEditableDraft(next).sections[sectionIndex].blocks[
                                        blockIndex
                                      ] as Extract<SectionBlock, { type: "row" }>;
                                      nextBlock.row.equalHeight = e.target.checked;
                                    })
                                  }
                                />
                                Equal height
                              </label>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                commit((next) => {
                                  const blocks = getEditableDraft(next).sections[sectionIndex].blocks;
                                  const sourceBlock = blocks[blockIndex];
                                  if (!sourceBlock || sourceBlock.type !== "row") {
                                    return;
                                  }

                                  const grouped = new Map<string, MediaItem[]>();
                                  sourceBlock.row.items.forEach((item) => {
                                    const key = filePrefixFromSrc(item.src) || item.id;
                                    const current = grouped.get(key);
                                    if (current) {
                                      current.push(item);
                                    } else {
                                      grouped.set(key, [item]);
                                    }
                                  });

                                  const entries = Array.from(grouped.entries());
                                  if (entries.length <= 1) {
                                    return;
                                  }

                                  const replacement: Extract<SectionBlock, { type: "row" }>[] = entries.map(
                                    ([prefix, items], index) => ({
                                      id: `${sourceBlock.id}-${prefix}-${index + 1}`,
                                      type: "row",
                                      row: {
                                        id: `${sourceBlock.row.id}-${prefix}-${index + 1}`,
                                        layout: items.length === 1 ? "row-1" : items.length === 2 ? "row-2" : "row-3",
                                        equalHeight: sourceBlock.row.equalHeight,
                                        items,
                                      },
                                    })
                                  );

                                  blocks.splice(blockIndex, 1, ...replacement);
                                })
                              }
                            >
                              Split by filename
                            </button>

                            <div className="editor-list">
                              {block.row.items.map((item, itemIndex) => {
                                const itemListKey = `project.section.${sectionIndex}.block.${blockIndex}.items`;
                                return (
                                  <article
                                    key={item.id}
                                    className="editor-item editor-media-item"
                                    draggable
                                    onDragStart={(e) => startDrag(e, itemListKey, itemIndex)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() =>
                                      onDrop(itemListKey, itemIndex, (from, to) =>
                                        commit((next) => {
                                          const nextBlock = getEditableDraft(next).sections[sectionIndex].blocks[
                                            blockIndex
                                          ] as Extract<SectionBlock, { type: "row" }>;
                                          nextBlock.row.items = reorder(nextBlock.row.items, from, to);
                                        })
                                      )
                                    }
                                  >
                                    <div className="editor-item-head">
                                      <strong>{item.id}</strong>
                                      <div className="editor-mini-actions">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            moveInList(itemListKey, itemIndex, -1, (from, to) =>
                                              commit((next) => {
                                                if (to >= 0) {
                                                  const nextBlock = getEditableDraft(next).sections[sectionIndex]
                                                    .blocks[blockIndex] as Extract<SectionBlock, { type: "row" }>;
                                                  nextBlock.row.items = reorder(nextBlock.row.items, from, to);
                                                }
                                              })
                                            )
                                          }
                                        >
                                          ↑
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            moveInList(itemListKey, itemIndex, 1, (from, to) =>
                                              commit((next) => {
                                                const nextBlock = getEditableDraft(next).sections[sectionIndex]
                                                  .blocks[blockIndex] as Extract<SectionBlock, { type: "row" }>;
                                                if (to < nextBlock.row.items.length) {
                                                  nextBlock.row.items = reorder(nextBlock.row.items, from, to);
                                                }
                                              })
                                            )
                                          }
                                        >
                                          ↓
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            commit((next) => {
                                              const nextBlock = getEditableDraft(next).sections[sectionIndex].blocks[
                                                blockIndex
                                              ] as Extract<SectionBlock, { type: "row" }>;
                                              nextBlock.row.items.splice(itemIndex, 1);
                                            })
                                          }
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>

                                    <label>
                                      Source
                                      <input
                                        value={item.src}
                                        onChange={(e) =>
                                          commit((next) => {
                                            const nextItem = (
                                              (getEditableDraft(next).sections[sectionIndex].blocks[
                                                blockIndex
                                              ] as Extract<SectionBlock, { type: "row" }>).row.items[itemIndex] as MediaItem
                                            );
                                            nextItem.src = e.target.value;
                                          })
                                        }
                                      />
                                    </label>
                                    <label>
                                      Source from project materials
                                      <select
                                        value={projectMaterials.includes(item.src) ? item.src : ""}
                                        onChange={(e) =>
                                          commit((next) => {
                                            const nextItem = (
                                              (getEditableDraft(next).sections[sectionIndex].blocks[
                                                blockIndex
                                              ] as Extract<SectionBlock, { type: "row" }>).row.items[itemIndex] as MediaItem
                                            );
                                            if (!e.target.value) {
                                              return;
                                            }
                                            nextItem.src = e.target.value;
                                            nextItem.type = mediaTypeFromSrc(e.target.value);
                                          })
                                        }
                                      >
                                        <option value="">Select file...</option>
                                        {projectMaterials.map((src) => (
                                          <option key={src} value={src}>
                                            {src}
                                          </option>
                                        ))}
                                      </select>
                                    </label>

                                    <label>
                                      Alt
                                      <input
                                        value={item.alt}
                                        onChange={(e) =>
                                          commit((next) => {
                                            const nextItem = (
                                              (getEditableDraft(next).sections[sectionIndex].blocks[
                                                blockIndex
                                              ] as Extract<SectionBlock, { type: "row" }>).row.items[itemIndex] as MediaItem
                                            );
                                            nextItem.alt = e.target.value;
                                          })
                                        }
                                      />
                                    </label>

                                    <div className="editor-grid-2">
                                      <label>
                                        Aspect ratio
                                        <input
                                          placeholder="1.777"
                                          type="number"
                                          step="0.000001"
                                          value={item.ar ?? ""}
                                          onChange={(e) =>
                                            commit((next) => {
                                              const nextItem = (
                                                (getEditableDraft(next).sections[sectionIndex].blocks[
                                                  blockIndex
                                                ] as Extract<SectionBlock, { type: "row" }>).row.items[
                                                  itemIndex
                                                ] as MediaItem
                                              );
                                              nextItem.ar = e.target.value ? Number(e.target.value) : undefined;
                                            })
                                          }
                                        />
                                      </label>

                                      <label>
                                        Type
                                        <select
                                          value={item.type ?? mediaTypeFromSrc(item.src)}
                                          onChange={(e) =>
                                            commit((next) => {
                                              const nextItem = (
                                                (getEditableDraft(next).sections[sectionIndex].blocks[
                                                  blockIndex
                                                ] as Extract<SectionBlock, { type: "row" }>).row.items[
                                                  itemIndex
                                                ] as MediaItem
                                              );
                                              nextItem.type = e.target.value as MediaItem["type"];
                                            })
                                          }
                                        >
                                          <option value="image">image</option>
                                          <option value="gif">gif</option>
                                          <option value="video">video</option>
                                        </select>
                                      </label>
                                    </div>
                                    {(item.type ?? mediaTypeFromSrc(item.src)) === "video" ? (
                                      <label className="editor-inline">
                                        <input
                                          type="checkbox"
                                          checked={Boolean(item.soundEnabled)}
                                          onChange={(e) =>
                                            commit((next) => {
                                              const nextItem = (
                                                (getEditableDraft(next).sections[sectionIndex].blocks[
                                                  blockIndex
                                                ] as Extract<SectionBlock, { type: "row" }>).row.items[
                                                  itemIndex
                                                ] as MediaItem
                                              );
                                              nextItem.soundEnabled = e.target.checked;
                                            })
                                          }
                                        />
                                        Enable sound toggle
                                      </label>
                                    ) : null}
                                  </article>
                                );
                              })}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                commit((next) => {
                                  const nextBlock = getEditableDraft(next).sections[sectionIndex].blocks[
                                    blockIndex
                                  ] as Extract<SectionBlock, { type: "row" }>;
                                  nextBlock.row.items.push({
                                    id: uid("media"),
                                    src: projectMaterials[0] ?? "",
                                    alt: "New media",
                                    type: mediaTypeFromSrc(projectMaterials[0] ?? ""),
                                  });
                                })
                              }
                            >
                              Add media item
                            </button>
                          </>
                        ) : (
                          <textarea
                            rows={block.type === "subheading" ? 2 : 3}
                            value={block.text}
                            onChange={(e) =>
                              commit((next) => {
                                const nextBlock = getEditableDraft(next).sections[sectionIndex].blocks[
                                  blockIndex
                                ] as Extract<SectionBlock, { type: "text" | "subheading" }>;
                                nextBlock.text = e.target.value;
                              })
                            }
                          />
                        )}
                        </details>
                        <div
                          className={`editor-drop-slot ${
                            dropSlot?.key === blockListKey && dropSlot.index === blockIndex + 1 ? "active" : ""
                          }`}
                          onDragOver={(e) => onSlotDragOver(e, blockListKey, blockIndex + 1)}
                          onDrop={() =>
                            onSlotDrop(blockListKey, blockIndex + 1, (from, to, fromListKey, toListKey) =>
                              commit((next) => {
                                const fromMeta = parseSectionBlocksListKey(fromListKey);
                                const toMeta = parseSectionBlocksListKey(toListKey);
                                if (!fromMeta || !toMeta) {
                                  return;
                                }
                                const allSections = getEditableDraft(next).sections;
                                const fromSection = allSections[fromMeta.sectionIndex];
                                const toSection = allSections[toMeta.sectionIndex];
                                if (!fromSection || !toSection) {
                                  return;
                                }
                                if (fromMeta.sectionIndex === toMeta.sectionIndex) {
                                  toSection.blocks = reorder(toSection.blocks, from, to);
                                  return;
                                }
                                const [moved] = fromSection.blocks.splice(from, 1);
                                if (!moved) {
                                  return;
                                }
                                const boundedTo = Math.max(0, Math.min(to, toSection.blocks.length));
                                toSection.blocks.splice(boundedTo, 0, moved);
                              })
                            )
                          }
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="editor-actions">
                  <button
                    type="button"
                    onClick={() =>
                      commit((next) => {
                        getEditableDraft(next).sections[sectionIndex].blocks.push({
                          id: uid("row"),
                          type: "row",
                          row: {
                            id: uid("row"),
                            layout: "row-2",
                            equalHeight: true,
                                items: [
                                  {
                                    id: uid("media"),
                                    src: projectMaterials[0] ?? "",
                                    alt: "New media",
                                    type: mediaTypeFromSrc(projectMaterials[0] ?? ""),
                                  },
                                ],
                              },
                        });
                      })
                    }
                  >
                    Add media row
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      commit((next) => {
                        getEditableDraft(next).sections[sectionIndex].blocks.push({
                          id: uid("header"),
                          type: "subheading",
                          text: "New header",
                        });
                      })
                    }
                  >
                    Add header block
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      commit((next) => {
                        getEditableDraft(next).sections[sectionIndex].blocks.push({
                          id: uid("text"),
                          type: "text",
                          text: "New text",
                        });
                      })
                    }
                  >
                    Add text block
                  </button>
                </div>
              </details>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              commit((next) => {
                getEditableDraft(next).sections.push({
                  id: uid("section"),
                  header: "New section",
                  about: "",
                  blocks: [],
                });
              })
            }
          >
            Add section
          </button>

          <label>
            Thanks text
            <input
              value={editableContent.thanksText ?? ""}
              onChange={(e) =>
                commit((next) => {
                  getEditableDraft(next).thanksText = e.target.value || undefined;
                })
              }
            />
          </label>
        </section>
      )}

      <section className="editor-section">
        <h2>Import / Export JSON</h2>
        <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={10} />
        <div className="editor-actions">
          <button
            type="button"
            onClick={() => {
              try {
                const parsed = ensureSpecialPages(ensureHomeProjectLinksAndEntries(JSON.parse(importText) as SiteContent));
                if (!parsed.projects || Object.keys(parsed.projects).length === 0) {
                  parsed.projects = { "project-1": createProjectTemplate("project-1", "New project") };
                }
                setContent(parsed);
                saveSiteContent(parsed);
                setProjectKey(Object.keys(parsed.projects)[0] ?? "project-1");
              } catch {
                alert("Invalid JSON");
              }
            }}
          >
            Apply JSON
          </button>
          <button
            type="button"
            onClick={() => {
              setImportText(exportJson);
            }}
          >
            Load current
          </button>
          <button
            type="button"
            onClick={() => {
              const next = cloneDefaultContent();
              setImportText(JSON.stringify(next, null, 2));
            }}
          >
            Load defaults
          </button>
        </div>
      </section>
    </main>
  );
}
