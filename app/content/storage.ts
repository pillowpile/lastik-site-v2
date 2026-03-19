"use client";

import { defaultSiteContent } from "./default-content";
import { HERO_BY_FOLDER, THUMB_BY_FOLDER, canonicalProjectSlug, keyToSlug, normalizeAssetPath, normalizeLookup, projectContentScore, sanitizeProjectKey } from "./project-helpers";
import type { ProjectPageContent, SiteContent } from "./types";
import recoveredProjectsData from "./recovered-projects.json";
import materialsIndexData from "../../public/materials-index.json";

export const SITE_CONTENT_KEY = "lastik.siteContent.v1";
export const SITE_CONTENT_EVENT = "site-content-updated";
const DEFAULT_REFERENCE_SITE_URL = "https://pp-web2.netlify.app";
const IS_LOCAL_BROWSER =
  typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const LOCAL_STORAGE_CONTENT_ENABLED =
  process.env.NEXT_PUBLIC_SITE_CONTENT_SOURCE === "local-storage" || process.env.NODE_ENV !== "production" || IS_LOCAL_BROWSER;

export function cloneDefaultContent(): SiteContent {
  return structuredClone(defaultSiteContent);
}

const PAGE_TAGS = new Set(["2d", "3d", "ai", "mix"]);
const SPECIAL_PAGE_KEYS: Array<keyof SiteContent["specialPages"]> = ["artdirCourse", "studio", "contacts"];
const HOME_CARD_SLUG_BY_ID: Record<string, string> = {
  p1: "vk-neo",
  p2: "mts",
  p3: "zvuk",
  p4: "vk-miniapps",
  p5: "sobchak",
  p6: "uralsib",
  p7: "rocs",
  p8: "sber-terminal",
  p9: "mail-ru",
  p10: "love-generation",
  p11: "eapteka",
  p12: "yandex-incl",
  p13: "volchok",
  p14: "presents-fest-2024",
  p15: "delimobil",
  p16: "i-want-to-know-everything",
  p17: "mansi",
  p18: "stranneyshie-horiz",
  p19: "hospitality",
  p20: "sber-high-res",
  p21: "unprincipled",
  p22: "green-idea",
  p23: "mosmuseum",
  p24: "vtb-1",
  p25: "supermarket-trollys-dream-v1",
  p26: "taxi-v2",
  p27: "the-skin-v1",
  p28: "saint-spring-v3",
  p29: "zvuk-2",
};
const HOME_CARD_TITLE_BY_ID: Record<string, string> = {
  p1: "VK / NEO",
  p17: "MANSI",
};
const HOME_SHAPES = new Set(["landscape", "portrait", "tall", "square"]);
const MATERIALS_BY_FOLDER: Record<string, string[]> = Object.fromEntries(
  Object.entries((materialsIndexData as { byFolder?: Record<string, unknown> }).byFolder ?? {}).map(([folder, files]) => [
    canonicalProjectSlug(folder),
    Array.isArray(files) ? files.filter((item): item is string => typeof item === "string") : [],
  ])
);

function normalizeHomeShape(shape: unknown): "landscape" | "portrait" | "tall" | "square" {
  if (typeof shape === "string" && HOME_SHAPES.has(shape)) {
    return shape as "landscape" | "portrait" | "tall" | "square";
  }
  return "landscape";
}

function buildDefaultHomeRows(projectIds: string[]): Array<{ id: string; projectIds: string[] }> {
  const rows: Array<{ id: string; projectIds: string[] }> = [];
  let offset = 0;
  let rowIndex = 1;
  while (offset < projectIds.length) {
    const size = rowIndex % 3 === 1 ? 2 : rowIndex % 3 === 2 ? 3 : 1;
    rows.push({
      id: `r${rowIndex}`,
      projectIds: projectIds.slice(offset, offset + size),
    });
    offset += size;
    rowIndex += 1;
  }
  return rows;
}

function zvukStoryboardSrc(index: number): string {
  return index === 4 || index === 7 ? `/materials/zvuk/sb/${index}.jpg` : `/materials/zvuk/sb/${index}.png`;
}

function rocsStoryboardSrc(index: number): string {
  return `/materials/rocs/sb/${index}.png`;
}

function rocsSketchSrc(index: number): string {
  return `/materials/rocs/sketch/${index}.png`;
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

function createProjectPlaceholder(projectKey: string, title: string): ProjectPageContent {
  return {
    backLabel: "← Back to projects",
    title: title.trim() || projectKey,
    materialsFolder: sanitizeProjectKey(projectKey) || undefined,
    referenceStyle: {
      mode: "default",
      siteUrl: "",
      styleName: "",
      useThisStyle: false,
      useSiteStyle: true,
    },
    introTexts: [],
    sections: [],
    thanksText: "",
  };
}

function inferLayoutByCount(count: number): "row-1" | "row-2" | "grid-3" {
  if (count <= 1) {
    return "row-1";
  }
  if (count === 2) {
    return "row-2";
  }
  return "grid-3";
}

function pickAutoHeroSrc(slug: string, project: ProjectPageContent): string | undefined {
  if (project.heroVideoSrc) {
    return project.heroVideoSrc;
  }
  const folder = canonicalProjectSlug(project.materialsFolder ?? slug);
  const all = MATERIALS_BY_FOLDER[folder] ?? [];
  const heroCandidate = all.find((src) => /hero\.(mp4|webm|mov)$/i.test(src));
  if (heroCandidate) {
    return heroCandidate;
  }
  return all.find((src) => /\.(mp4|webm|mov)$/i.test(src));
}

function formatAutoSectionHeader(group: string): string {
  if (group === "materials") {
    return "Materials";
  }
  return group
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildAutoMaterialsSections(slug: string, project: ProjectPageContent) {
  const folder = canonicalProjectSlug(project.materialsFolder ?? slug);
  const all = MATERIALS_BY_FOLDER[folder] ?? [];
  if (all.length === 0) {
    return [];
  }
  const hero = (project.heroVideoSrc ?? "").toLowerCase();
  const thumb = (THUMB_BY_FOLDER[folder] ?? "").toLowerCase();
  const media = all.filter((src) => {
    const lower = src.toLowerCase();
    if (lower === hero || lower === thumb) {
      return false;
    }
    return /\.(mp4|webm|mov|jpg|jpeg|png|gif|avif|webp)$/i.test(lower);
  });
  if (media.length === 0) {
    return [];
  }

  const prefix = `/materials/${folder}/`;
  const grouped = new Map<string, string[]>();
  for (const src of media) {
    const normalized = src.replace(/^\.\//, "/");
    const relative = normalized.startsWith(prefix) ? normalized.slice(prefix.length) : "";
    const firstSegment = relative.includes("/") ? relative.slice(0, relative.indexOf("/")) : "";
    const group = firstSegment ? canonicalProjectSlug(firstSegment) : "materials";
    if (!grouped.has(group)) {
      grouped.set(group, []);
    }
    grouped.get(group)?.push(src);
  }

  const sections: Array<{
    id: string;
    header: string;
    about: string;
    blocks: Array<{
      id: string;
      type: "row";
      row: {
        id: string;
        layout: "row-1" | "row-2" | "grid-3";
        items: Array<{ id: string; src: string; alt: string }>;
      };
    }>;
  }> = [];

  for (const [group, items] of grouped.entries()) {
    const sectionId = `${folder}-${group}`;
    const blocks = [];
    for (let offset = 0; offset < items.length; offset += 24) {
      const chunkIndex = Math.floor(offset / 24) + 1;
      const chunk = items.slice(offset, offset + 24);
      blocks.push({
        id: `${sectionId}-row-${chunkIndex}`,
        type: "row" as const,
        row: {
          id: `${sectionId}-items-${chunkIndex}`,
          layout: inferLayoutByCount(chunk.length),
          items: chunk.map((src, index) => ({
            id: `${sectionId}-${offset + index + 1}`,
            src,
            alt: `${project.title} material ${offset + index + 1}`,
          })),
        },
      });
    }
    if (blocks.length > 0) {
      sections.push({
        id: sectionId,
        header: formatAutoSectionHeader(group),
        about: "",
        blocks,
      });
    }
  }

  return sections;
}

function applyRecoveredProjects(content: SiteContent): void {
  const recovered = (recoveredProjectsData as { projects?: Record<string, ProjectPageContent> }).projects ?? {};
  const disallowed = new Set(["tmp", "project-p6"]);
  for (const [slugRaw, value] of Object.entries(recovered)) {
    const slug = canonicalProjectSlug(slugRaw);
    if (!slug || disallowed.has(slug)) {
      continue;
    }
    const normalized = structuredClone(value);
    if ((normalized.heroVideoSrc as unknown) === "$undefined") {
      normalized.heroVideoSrc = undefined;
    }
    normalized.materialsFolder = canonicalProjectSlug(normalized.materialsFolder ?? slug);

    const existingKey = resolveProjectKeyBySlug(content.projects, slug);
    const targetKey = existingKey ?? slug;
    const existing = content.projects[targetKey];
    if (!existing || projectContentScore(normalized) > projectContentScore(existing)) {
      content.projects[targetKey] = normalized;
    }
  }
}

function hasOnlyPreviewSection(project: ProjectPageContent): boolean {
  if (project.sections.length !== 1) {
    return false;
  }
  const first = project.sections[0];
  const id = normalizeLookup(first.id ?? "");
  const title = normalizeLookup(first.title ?? "");
  const header = normalizeLookup(first.header ?? "");
  return id.includes("preview") || title.includes("preview") || header.includes("preview");
}

function dedupeProjectSections(project: ProjectPageContent): void {
  const seenSections = new Set<string>();
  const nextSections: ProjectPageContent["sections"] = [];

  for (const section of project.sections) {
    const sectionKey = normalizeLookup(section.id || section.header || section.title || "");
    if (sectionKey && seenSections.has(sectionKey)) {
      continue;
    }
    if (sectionKey) {
      seenSections.add(sectionKey);
    }

    const seenBlocks = new Set<string>();
    const nextBlocks = [];

    for (const block of section.blocks) {
      const blockKey = normalizeLookup(block.id || "");
      if (blockKey && seenBlocks.has(blockKey)) {
        continue;
      }
      if (blockKey) {
        seenBlocks.add(blockKey);
      }

      if (block.type === "row") {
        const seenItems = new Set<string>();
        block.row.items = block.row.items.filter((item) => {
          const itemKey = normalizeLookup(item.id || item.src || "");
          if (!itemKey) {
            return true;
          }
          if (seenItems.has(itemKey)) {
            return false;
          }
          seenItems.add(itemKey);
          return true;
        });
      }

      nextBlocks.push(block);
    }

    section.blocks = nextBlocks;
    nextSections.push(section);
  }

  project.sections = nextSections;
}

function isClearlyCrosswiredProject(project: ProjectPageContent, expectedSlug: string): boolean {
  const folder = sanitizeProjectKey(project.materialsFolder ?? "");
  const title = (project.title ?? "").toLowerCase();
  const hero = (project.heroVideoSrc ?? "").toLowerCase();
  if (expectedSlug === "yandex-incl") {
    return false;
  }
  const yandexSignals =
    title.includes("яндекс") ||
    title.includes("шедеврум") ||
    folder === "yandex-incl" ||
    hero.includes("/materials/yandex-incl/");
  return yandexSignals;
}

function normalizePageTags(tags: unknown): ProjectPageContent["tags"] {
  if (!Array.isArray(tags)) {
    return [];
  }
  const next = tags
    .map((item) => (typeof item === "string" ? item.toLowerCase().trim() : ""))
    .filter((item): item is "2d" | "3d" | "ai" | "mix" => PAGE_TAGS.has(item));
  return Array.from(new Set(next));
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

function ensureRequiredProjects(content: SiteContent): SiteContent {
  const next = structuredClone(content);
  applyRecoveredProjects(next);
  if (!next.specialPages || typeof next.specialPages !== "object") {
    next.specialPages = structuredClone(defaultSiteContent.specialPages);
  }
  for (const key of SPECIAL_PAGE_KEYS) {
    if (!next.specialPages[key]) {
      next.specialPages[key] = structuredClone(defaultSiteContent.specialPages[key]);
    }
  }
  if (typeof next.home.referenceSiteUrl !== "string") {
    next.home.referenceSiteUrl = "";
  }
  if (!next.home.referenceSiteUrl.trim()) {
    next.home.referenceSiteUrl = DEFAULT_REFERENCE_SITE_URL;
  }
  const defaultEapteka = defaultSiteContent.projects.eapteka;
  const defaultEaptekaCard = defaultSiteContent.home.projects.find((card) => card.href === "/projects/eapteka");
  const defaultRocsCard = defaultSiteContent.home.projects.find((card) => normalizeLookup(card.title) === "rocs");
  const defaultUralsibCard = defaultSiteContent.home.projects.find((card) => card.title.toLowerCase() === "уралсиб");
  const defaultYandexCard = defaultSiteContent.home.projects.find((card) => card.href === "/projects/yandex-incl");
  const defaultDelimobilCard = defaultSiteContent.home.projects.find((card) => card.href === "/projects/delimobil");
  const defaultVolchokCard = defaultSiteContent.home.projects.find((card) => card.href === "/projects/volchok");

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

  if (defaultEapteka && !next.projects.eapteka) {
    next.projects.eapteka = structuredClone(defaultEapteka);
  }
  if (!next.projects.delimobil) {
    next.projects.delimobil = createProjectPlaceholder("delimobil", defaultDelimobilCard?.title ?? "DELIMOBIL");
  }
  next.projects.delimobil.materialsFolder = "delimobil";
  next.projects.delimobil.heroVideoSrc = HERO_BY_FOLDER.delimobil;
  if (!next.projects.volchok) {
    next.projects.volchok = createProjectPlaceholder("volchok", defaultVolchokCard?.title ?? "VOLCHOK");
  }
  next.projects.volchok.materialsFolder = "volchok";
  next.projects.volchok.heroVideoSrc = HERO_BY_FOLDER.volchok;

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

  const sobchakByFolder = findProjectKeyByMaterialsFolder(next.projects, "sobchak");
  if (!next.projects.sobchak && sobchakByFolder) {
    moveProjectKey(next.projects, sobchakByFolder, "sobchak");
  } else {
    const sobchakByTitle = findProjectKeyByTitle(next.projects, "собчак");
    if (!next.projects.sobchak && sobchakByTitle) {
      moveProjectKey(next.projects, sobchakByTitle, "sobchak");
    }
  }

  for (const key of Object.keys(next.projects)) {
    const folder = sanitizeProjectKey(next.projects[key].materialsFolder ?? "") || sanitizeProjectKey(keyToSlug(key));
    next.projects[key].tags = normalizePageTags(next.projects[key].tags);
    next.projects[key].heroVideoSrc = normalizeAssetPath(next.projects[key].heroVideoSrc, folder);
    next.projects[key].heroPoster = normalizeAssetPath(next.projects[key].heroPoster, folder);
    if (!next.projects[key].heroVideoSrc && HERO_BY_FOLDER[folder]) {
      next.projects[key].heroVideoSrc = HERO_BY_FOLDER[folder];
    }
    if (!next.projects[key].heroVideoSrc) {
      next.projects[key].heroVideoSrc = pickAutoHeroSrc(folder, next.projects[key]);
    }

    if (normalizeLookup(key) === "eapteka") {
      const heroSrc = next.projects[key].heroVideoSrc?.toLowerCase() ?? "";
      if (!heroSrc || heroSrc.includes("eapteka_thumb")) {
        next.projects[key].heroVideoSrc = "/materials/eapteka/sber_eapteka_hero.mp4";
      }
      if (!next.projects[key].materialsFolder) {
        next.projects[key].materialsFolder = "eapteka";
      }
    }

    if (normalizeLookup(key) === "lovegeneration") {
      next.projects[key].heroVideoSrc = "/materials/love-generation/love_generation (1080p)_1_prob4.mp4";
      if (!next.projects[key].materialsFolder) {
        next.projects[key].materialsFolder = "love-generation";
      }
    }
    if (normalizeLookup(key) === "mansi") {
      next.projects[key].title = "MANSI";
      if (!next.projects[key].materialsFolder) {
        next.projects[key].materialsFolder = "mansi";
      }
    }
    if (normalizeLookup(key) === "sobchak" && !next.projects[key].heroVideoSrc) {
      next.projects[key].heroVideoSrc = "/materials/sobchak/sobchak_hero.mp4";
    }
    if (normalizeLookup(key) === "mts" && !next.projects[key].heroVideoSrc) {
      next.projects[key].heroVideoSrc = "/materials/mts/mts_hero.mp4";
    }

    if (normalizeLookup(folder).includes("zvuk")) {
      const hasStoryboardSection = next.projects[key].sections.some(
        (section) =>
          normalizeLookup(section.id) === "storyboardsb" ||
          (section.header ?? "").toLowerCase().includes("раскадровка") ||
          (section.title ?? "").toLowerCase().includes("раскадровка")
      );
      if (!hasStoryboardSection) {
        next.projects[key].sections.push({
          id: "storyboard-sb",
          header: "Раскадровка",
          about: "",
          blocks: [
            {
              id: "storyboard-sb-grid",
              type: "row",
              row: {
                id: "storyboard-sb-items",
                layout: "grid-3",
                items: Array.from({ length: 27 }, (_, idx) => {
                  const n = idx + 1;
                  return {
                    id: `zvuk-sb-${String(n).padStart(2, "0")}`,
                    src: zvukStoryboardSrc(n),
                    alt: `ZVUK storyboard ${n}`,
                  };
                }),
              },
            },
          ],
        });
      }
    }

    if (normalizeLookup(folder).includes("rocs")) {
      const hasStoryboardSection = next.projects[key].sections.some(
        (section) =>
          normalizeLookup(section.id) === "storyboard-rocs" ||
          (section.header ?? "").toLowerCase().includes("раскадровка") ||
          (section.title ?? "").toLowerCase().includes("раскадровка")
      );
      if (!hasStoryboardSection) {
        next.projects[key].sections.push({
          id: "storyboard-rocs",
          header: "Раскадровка",
          about: "",
          blocks: [
            {
              id: "storyboard-rocs-grid",
              type: "row",
              row: {
                id: "storyboard-rocs-items",
                layout: "grid-3",
                items: Array.from({ length: 14 }, (_, idx) => {
                  const n = idx + 1;
                  return {
                    id: `rocs-sb-${String(n).padStart(2, "0")}`,
                    src: rocsStoryboardSrc(n),
                    alt: `R.O.C.S storyboard ${n}`,
                  };
                }),
              },
            },
          ],
        });
      }

      const hasSketchSection = next.projects[key].sections.some(
        (section) =>
          normalizeLookup(section.id) === "sketch-rocs" ||
          (section.header ?? "").toLowerCase().includes("скетч") ||
          (section.title ?? "").toLowerCase().includes("скетч")
      );
      if (!hasSketchSection) {
        next.projects[key].sections.push({
          id: "sketch-rocs",
          header: "Скетчи",
          about: "",
          blocks: [
            {
              id: "sketch-rocs-grid",
              type: "row",
              row: {
                id: "sketch-rocs-items",
                layout: "grid-3",
                items: Array.from({ length: 10 }, (_, idx) => {
                  const n = idx + 1;
                  return {
                    id: `rocs-sketch-${String(n).padStart(2, "0")}`,
                    src: rocsSketchSrc(n),
                    alt: `R.O.C.S sketch ${n}`,
                  };
                }),
              },
            },
          ],
        });
      }
    }

    if (normalizeLookup(folder).includes("uralsib")) {
      const hasCharactersSection = next.projects[key].sections.some(
        (section) =>
          normalizeLookup(section.id) === "characters-uralsib" ||
          (section.header ?? "").toLowerCase().includes("персонаж") ||
          (section.title ?? "").toLowerCase().includes("персонаж")
      );
      if (!hasCharactersSection) {
        next.projects[key].sections.push({
          id: "characters-uralsib",
          header: "Персонажи",
          about: "",
          blocks: [
            {
              id: "uralsib-characters-row-1",
              type: "row",
              row: {
                id: "uralsib-characters-items-1",
                layout: "row-3",
                items: [
                  { id: "uralsib-pers1-1", src: "/materials/uralsib/pers_sketch/pers1-1.jpg", alt: "Uralsib character sketch 1-1" },
                  { id: "uralsib-pers1-2", src: "/materials/uralsib/pers_sketch/pers1-2.jpg", alt: "Uralsib character sketch 1-2" },
                  { id: "uralsib-pers1-3", src: "/materials/uralsib/pers_sketch/pers1-3.jpg", alt: "Uralsib character sketch 1-3" },
                ],
              },
            },
            {
              id: "uralsib-characters-row-2",
              type: "row",
              row: {
                id: "uralsib-characters-items-2",
                layout: "row-3",
                items: [
                  { id: "uralsib-pers2-1", src: "/materials/uralsib/pers_sketch/pers2-1.jpg", alt: "Uralsib character sketch 2-1" },
                  { id: "uralsib-pers2-2", src: "/materials/uralsib/pers_sketch/pers2-2.jpg", alt: "Uralsib character sketch 2-2" },
                  { id: "uralsib-pers2-3", src: "/materials/uralsib/pers_sketch/pers2-3.png", alt: "Uralsib character sketch 2-3" },
                ],
              },
            },
            {
              id: "uralsib-characters-row-3",
              type: "row",
              row: {
                id: "uralsib-characters-items-3",
                layout: "row-3",
                items: [
                  { id: "uralsib-pers3-1", src: "/materials/uralsib/pers_sketch/pers3-1.jpg", alt: "Uralsib character sketch 3-1" },
                  { id: "uralsib-pers3-2", src: "/materials/uralsib/pers_sketch/pers3-2.jpg", alt: "Uralsib character sketch 3-2" },
                  { id: "uralsib-pers3-3", src: "/materials/uralsib/pers_sketch/pers3-3.jpg", alt: "Uralsib character sketch 3-3" },
                ],
              },
            },
            {
              id: "uralsib-characters-row-4",
              type: "row",
              row: {
                id: "uralsib-characters-items-4",
                layout: "row-1",
                items: [{ id: "uralsib-pers4", src: "/materials/uralsib/pers_sketch/pers4.jpg", alt: "Uralsib character sketch 4" }],
              },
            },
          ],
        });
      }
    }

    if (normalizeLookup(folder).includes("sberterminal")) {
      const hasTerminalSection = next.projects[key].sections.some(
        (section) =>
          normalizeLookup(section.id) === "terminal-sber" ||
          (section.header ?? "").toLowerCase().includes("терминал") ||
          (section.title ?? "").toLowerCase().includes("терминал")
      );
      if (!hasTerminalSection) {
        next.projects[key].sections.push({
          id: "terminal-sber",
          header: "Терминал",
          about: "",
          blocks: [
            {
              id: "terminal-sber-grid",
              type: "row",
              row: {
                id: "terminal-sber-grid-items",
                layout: "grid-3",
                items: [
                  {
                    id: "terminal-grid-1",
                    src: "/materials/sber-terminal/term_grid/photo_2026-03-09_15-05-06.jpg",
                    alt: "Sber terminal grid 1",
                  },
                  {
                    id: "terminal-grid-2",
                    src: "/materials/sber-terminal/term_grid/photo_2026-03-09_15-05-17.jpg",
                    alt: "Sber terminal grid 2",
                  },
                  {
                    id: "terminal-grid-3",
                    src: "/materials/sber-terminal/term_grid/photo_2026-03-09_15-05-20.jpg",
                    alt: "Sber terminal grid 3",
                  },
                  {
                    id: "terminal-grid-4",
                    src: "/materials/sber-terminal/term_grid/photo_2026-03-09_15-05-22.jpg",
                    alt: "Sber terminal grid 4",
                  },
                  {
                    id: "terminal-grid-5",
                    src: "/materials/sber-terminal/term_grid/photo_2026-03-09_15-05-23.jpg",
                    alt: "Sber terminal grid 5",
                  },
                  {
                    id: "terminal-grid-6",
                    src: "/materials/sber-terminal/term_grid/photo_2026-03-09_15-05-25.jpg",
                    alt: "Sber terminal grid 6",
                  },
                  {
                    id: "terminal-grid-7",
                    src: "/materials/sber-terminal/term_grid/photo_2026-03-09_15-05-27.jpg",
                    alt: "Sber terminal grid 7",
                  },
                  {
                    id: "terminal-grid-8",
                    src: "/materials/sber-terminal/term_grid/photo_2026-03-09_15-08-25.jpg",
                    alt: "Sber terminal grid 8",
                  },
                ],
              },
            },
            {
              id: "terminal-sber-row",
              type: "row",
              row: {
                id: "terminal-sber-row-items",
                layout: "row-3",
                items: [
                  { id: "terminal-row-1", src: "/materials/sber-terminal/term_row1/term-2-1.jpg", alt: "Sber terminal row 1" },
                  { id: "terminal-row-2", src: "/materials/sber-terminal/term_row1/term-2-2.jpg", alt: "Sber terminal row 2" },
                  { id: "terminal-row-3", src: "/materials/sber-terminal/term_row1/term-2-3.jpg", alt: "Sber terminal row 3" },
                ],
              },
            },
          ],
        });
      }
    }
  }

  for (const key of SPECIAL_PAGE_KEYS) {
    const page = next.specialPages[key];
    const defaultPage = defaultSiteContent.specialPages[key];
    const folder = sanitizeProjectKey(page.materialsFolder ?? "") || sanitizeProjectKey(defaultPage.materialsFolder ?? "");
    page.tags = normalizePageTags(page.tags);
    page.heroVideoSrc = normalizeAssetPath(page.heroVideoSrc, folder);
    page.heroPoster = normalizeAssetPath(page.heroPoster, folder);
    if (!page.backLabel) {
      page.backLabel = defaultPage.backLabel;
    }
    if (!page.title) {
      page.title = defaultPage.title;
    }
  }

  if (defaultEaptekaCard) {
    const normalizedCards = next.home.projects.map((card) => {
      const safeShape = normalizeHomeShape((card as { shape?: unknown }).shape);
      const forcedSlug = HOME_CARD_SLUG_BY_ID[card.id];
      const projectSlug = hrefToProjectSlug(card.href);
      const titleFallbackSlug =
        canonicalProjectSlug(card.title) || canonicalProjectSlug(card.id) || canonicalProjectSlug(card.href ?? "");
      const effectiveSlug = forcedSlug || projectSlug || titleFallbackSlug;
      let resolvedKey = effectiveSlug ? resolveProjectKeyBySlug(next.projects, effectiveSlug) : null;
      if (effectiveSlug && !resolvedKey) {
        next.projects[effectiveSlug] = createProjectPlaceholder(effectiveSlug, card.title);
        resolvedKey = effectiveSlug;
      }
      const canonicalHref = effectiveSlug
        ? `/projects/${effectiveSlug}`
        : resolvedKey
          ? `/projects/${keyToSlug(resolvedKey)}`
          : undefined;
      const folderForThumb = forcedSlug || (resolvedKey
        ? sanitizeProjectKey(next.projects[resolvedKey].materialsFolder ?? "") || sanitizeProjectKey(keyToSlug(resolvedKey))
        : sanitizeProjectKey(effectiveSlug ?? ""));
      const normalizedThumb = normalizeAssetPath(card.thumbnailSrc, folderForThumb);
      const fallbackThumb = THUMB_BY_FOLDER[folderForThumb] || THUMB_BY_FOLDER["vk-neo"];
      const shouldNormalizeNeoTitle =
        card.id === "p1" ||
        normalizeLookup(card.title) === "vkheo" ||
        normalizeLookup(card.title) === "vkneo" ||
        normalizeLookup(projectSlug ?? "") === "vkneo";
      if (card.href === "/projects/eapteka") {
        return {
          ...card,
          title: defaultEaptekaCard.title,
          shape: defaultEaptekaCard.shape,
          tone: defaultEaptekaCard.tone,
          thumbnailSrc: normalizedThumb || defaultEaptekaCard.thumbnailSrc,
          ...(canonicalHref ? { href: canonicalHref } : {}),
        };
      }
      if (defaultRocsCard && (card.id === defaultRocsCard.id || normalizeLookup(card.title) === normalizeLookup(defaultRocsCard.title))) {
        return {
          ...card,
          shape: safeShape,
          thumbnailSrc: normalizedThumb || defaultRocsCard.thumbnailSrc,
          ...(canonicalHref ? { href: canonicalHref } : {}),
        };
      }
      if (card.id === "p5" || card.title.toLowerCase().includes("собчак")) {
        return {
          ...card,
          shape: safeShape,
          ...(normalizedThumb || THUMB_BY_FOLDER.sobchak ? { thumbnailSrc: normalizedThumb || THUMB_BY_FOLDER.sobchak } : {}),
          href: "/projects/sobchak",
        };
      }
      if (
        card.id === "p6" ||
        normalizeLookup(card.title).includes("uralsib") ||
        card.title.toLowerCase().includes("уралсиб")
      ) {
        return {
          ...card,
          shape: safeShape,
          ...(normalizedThumb || THUMB_BY_FOLDER.uralsib ? { thumbnailSrc: normalizedThumb || THUMB_BY_FOLDER.uralsib } : {}),
          href: "/projects/uralsib",
        };
      }
      if (
        card.id === "p15" ||
        normalizeLookup(card.title).includes("delimobil") ||
        normalizeLookup(projectSlug ?? "") === "delimobil"
      ) {
        return {
          ...card,
          shape: safeShape,
          ...(THUMB_BY_FOLDER.delimobil || normalizedThumb ? { thumbnailSrc: THUMB_BY_FOLDER.delimobil || normalizedThumb } : {}),
          href: "/projects/delimobil",
        };
      }
      return {
        ...card,
        shape: safeShape,
        ...(HOME_CARD_TITLE_BY_ID[card.id] ? { title: HOME_CARD_TITLE_BY_ID[card.id] } : {}),
        ...(shouldNormalizeNeoTitle ? { title: "VK / NEO" } : {}),
        ...(normalizedThumb || fallbackThumb ? { thumbnailSrc: normalizedThumb || fallbackThumb } : {}),
        href: canonicalHref,
      };
    });

    const deduped: typeof normalizedCards = [];
    const idToIndex = new Map<string, number>();
    const hrefToIndex = new Map<string, number>();
    for (const card of normalizedCards) {
      const existingIdIndex = idToIndex.get(card.id);
      if (existingIdIndex !== undefined) {
        const existing = deduped[existingIdIndex];
        deduped[existingIdIndex] = {
          ...existing,
          ...(existing.href ? {} : card.href ? { href: card.href } : {}),
          ...(existing.thumbnailSrc ? {} : card.thumbnailSrc ? { thumbnailSrc: card.thumbnailSrc } : {}),
        };
        continue;
      }
      if (!card.href?.startsWith("/projects/")) {
        idToIndex.set(card.id, deduped.length);
        deduped.push(card);
        continue;
      }
      const existingIndex = hrefToIndex.get(card.href);
      if (existingIndex !== undefined) {
        const existing = deduped[existingIndex];
        if (!existing.thumbnailSrc && card.thumbnailSrc) {
          deduped[existingIndex] = {
            ...existing,
            thumbnailSrc: card.thumbnailSrc,
          };
        }
        continue;
      }
      idToIndex.set(card.id, deduped.length);
      hrefToIndex.set(card.href, deduped.length);
      deduped.push(card);
    }
    next.home.projects = deduped;

    // Keep localStorage content in sync with newly added default cards.
    for (const defaultCard of defaultSiteContent.home.projects) {
      const hasById = next.home.projects.some((card) => card.id === defaultCard.id);
      const hasByHref = defaultCard.href
        ? next.home.projects.some((card) => card.href === defaultCard.href)
        : false;
      if (!hasById && !hasByHref) {
        next.home.projects.push(structuredClone(defaultCard));
      }
    }

    const hasCard = next.home.projects.some((card) => card.href === "/projects/eapteka");
    if (!hasCard) {
      next.home.projects.push(structuredClone(defaultEaptekaCard));
    }

    if (defaultUralsibCard) {
      const hasUralsib = next.home.projects.some(
        (card) => card.id === defaultUralsibCard.id || card.title.toLowerCase() === defaultUralsibCard.title.toLowerCase()
      );
      if (!hasUralsib) {
        next.home.projects.push(structuredClone(defaultUralsibCard));
      }
    }

    if (defaultYandexCard) {
      const hasYandex = next.home.projects.some(
        (card) =>
          card.id === defaultYandexCard.id ||
          card.href === defaultYandexCard.href ||
          normalizeLookup(card.title).includes("yandex") ||
          normalizeLookup(card.title).includes("inclusive")
      );
      if (!hasYandex) {
        next.home.projects.push(structuredClone(defaultYandexCard));
      }
    }
    if (defaultDelimobilCard) {
      const hasDelimobil = next.home.projects.some((card) => hrefToProjectSlug(card.href) === "delimobil");
      if (!hasDelimobil) {
        next.home.projects.push(structuredClone(defaultDelimobilCard));
      }
    }
    if (defaultVolchokCard) {
      const hasVolchok = next.home.projects.some((card) => hrefToProjectSlug(card.href) === "volchok");
      if (!hasVolchok) {
        next.home.projects.push(structuredClone(defaultVolchokCard));
      }
    }

    const finalDeduped: typeof next.home.projects = [];
    const finalIdToIndex = new Map<string, number>();
    const finalHrefToIndex = new Map<string, number>();
    for (const card of next.home.projects) {
      const existingById = finalIdToIndex.get(card.id);
      if (existingById !== undefined) {
        const existing = finalDeduped[existingById];
        finalDeduped[existingById] = {
          ...existing,
          ...(existing.href ? {} : card.href ? { href: card.href } : {}),
          ...(existing.thumbnailSrc ? {} : card.thumbnailSrc ? { thumbnailSrc: card.thumbnailSrc } : {}),
        };
        continue;
      }
      const hrefKey = card.href?.startsWith("/projects/") ? card.href : null;
      if (hrefKey) {
        const existingByHref = finalHrefToIndex.get(hrefKey);
        if (existingByHref !== undefined) {
          const existing = finalDeduped[existingByHref];
          finalDeduped[existingByHref] = {
            ...existing,
            ...(existing.thumbnailSrc ? {} : card.thumbnailSrc ? { thumbnailSrc: card.thumbnailSrc } : {}),
          };
          continue;
        }
      }
      finalIdToIndex.set(card.id, finalDeduped.length);
      if (hrefKey) {
        finalHrefToIndex.set(hrefKey, finalDeduped.length);
      }
      finalDeduped.push(card);
    }
    next.home.projects = finalDeduped;

    for (const card of next.home.projects) {
      const slug = hrefToProjectSlug(card.href);
      if (!slug) {
        continue;
      }
      const hasProject = Boolean(resolveProjectKeyBySlug(next.projects, slug));
      if (!hasProject) {
        next.projects[slug] = createProjectPlaceholder(slug, card.title);
      }
    }

    const forcedEntries = Object.entries(HOME_CARD_SLUG_BY_ID);
    for (const [cardId, forcedSlug] of forcedEntries) {
      const card = next.home.projects.find((item) => item.id === cardId);
      if (!card) {
        continue;
      }
      card.href = `/projects/${forcedSlug}`;
      if (!card.thumbnailSrc && THUMB_BY_FOLDER[forcedSlug]) {
        card.thumbnailSrc = THUMB_BY_FOLDER[forcedSlug];
      }

      const resolvedKey = resolveProjectKeyBySlug(next.projects, forcedSlug);
      if (!resolvedKey) {
        if (forcedSlug === "vk-miniapps") {
          next.projects.vkMiniApps = createProjectPlaceholder(forcedSlug, card.title);
        } else {
          next.projects[forcedSlug] = createProjectPlaceholder(forcedSlug, card.title);
        }
      } else if (resolvedKey !== forcedSlug) {
        const isVkMiniAppsAlias = forcedSlug === "vk-miniapps" && resolvedKey === "vkMiniApps";
        if (!isVkMiniAppsAlias) {
          const current = next.projects[forcedSlug];
          const candidate = next.projects[resolvedKey];
          const currentScore = current ? projectContentScore(current) : -1;
          const candidateScore = candidate ? projectContentScore(candidate) : -1;
          // Prefer the richest project data for canonical slug keys in editor/content storage.
          if (candidate && (!current || isProjectPlaceholder(current) || candidateScore > currentScore)) {
            next.projects[forcedSlug] = candidate;
          }
          if (resolvedKey !== forcedSlug) {
            delete next.projects[resolvedKey];
          }
        }
      }

      const project = next.projects[forcedSlug] ?? (forcedSlug === "vk-miniapps" ? next.projects.vkMiniApps : undefined);
      if (!project) {
        continue;
      }
      project.materialsFolder = forcedSlug;
      if (!project.heroVideoSrc && HERO_BY_FOLDER[forcedSlug]) {
        project.heroVideoSrc = HERO_BY_FOLDER[forcedSlug];
      }

      if (isClearlyCrosswiredProject(project, forcedSlug)) {
        const recovered = createProjectPlaceholder(forcedSlug, card.title);
        recovered.materialsFolder = forcedSlug;
        recovered.heroVideoSrc = HERO_BY_FOLDER[forcedSlug];
        next.projects[forcedSlug] = recovered;
      }
    }
    if (next.projects.delimobil) {
      next.projects.delimobil.materialsFolder = "delimobil";
      next.projects.delimobil.heroVideoSrc = HERO_BY_FOLDER.delimobil;
    }
    if (next.projects.volchok) {
      next.projects.volchok.materialsFolder = "volchok";
      next.projects.volchok.heroVideoSrc = HERO_BY_FOLDER.volchok;
    }

    const eaptekaIndex = next.home.projects.findIndex((card) => card.href === "/projects/eapteka");
    const mtsIndex = next.home.projects.findIndex(
      (card) =>
        card.id === "p2" ||
        normalizeLookup(card.title).includes("nikusay") ||
        card.title.toLowerCase().includes("никусай")
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
  }

  next.home.projects = next.home.projects.map((card) => ({
    ...card,
    shape: normalizeHomeShape((card as { shape?: unknown }).shape),
  }));
  if (typeof next.home.heroTitle !== "string" || !next.home.heroTitle.trim()) {
    next.home.heroTitle = defaultSiteContent.home.heroTitle;
  }
  if (typeof next.home.mottoText !== "string") {
    next.home.mottoText = defaultSiteContent.home.mottoText ?? "";
  }
  if (typeof next.home.footerText !== "string" || !next.home.footerText.trim()) {
    next.home.footerText = defaultSiteContent.home.footerText;
  }

  const cardIdSet = new Set(next.home.projects.map((card) => card.id));
  const rawRows = Array.isArray(next.home.rows) ? next.home.rows : [];
  const normalizedRows = rawRows
    .map((row, idx) => {
      const id = typeof row?.id === "string" && row.id.trim() ? row.id : `r${idx + 1}`;
      const projectIds = Array.isArray(row?.projectIds)
        ? row.projectIds.filter((projectId): projectId is string => typeof projectId === "string" && cardIdSet.has(projectId)).slice(0, 3)
        : [];
      return { id, projectIds };
    })
    .filter((row) => row.projectIds.length > 0);
  next.home.rows = normalizedRows.length > 0 ? normalizedRows : buildDefaultHomeRows(next.home.projects.map((card) => card.id));

  const rawStickers = Array.isArray(next.home.stickers) ? next.home.stickers : [];
  const normalizedStickers = rawStickers
    .map((sticker, idx) => {
      if (!sticker || typeof sticker !== "object" || typeof sticker.src !== "string" || !sticker.src.trim()) {
        return null;
      }
      const id = typeof sticker.id === "string" && sticker.id.trim() ? sticker.id : `s${idx + 1}`;
      const alt = typeof sticker.alt === "string" ? sticker.alt : "";
      return { id, src: sticker.src.trim(), alt };
    })
    .filter((item): item is { id: string; src: string; alt: string } => Boolean(item));
  next.home.stickers = normalizedStickers.length > 0
    ? normalizedStickers
    : structuredClone(defaultSiteContent.home.stickers ?? []);

  // Second pass is required because placeholders are created from home cards later in this function.
  // Without this pass, those generated project entries miss hero media, derived sections and fallback text.
  for (const key of Object.keys(next.projects)) {
    const folder = sanitizeProjectKey(next.projects[key].materialsFolder ?? "") || sanitizeProjectKey(keyToSlug(key));
    next.projects[key].tags = normalizePageTags(next.projects[key].tags);
    next.projects[key].heroVideoSrc = normalizeAssetPath(next.projects[key].heroVideoSrc, folder);
    next.projects[key].heroPoster = normalizeAssetPath(next.projects[key].heroPoster, folder);
    if (!next.projects[key].heroVideoSrc && HERO_BY_FOLDER[folder]) {
      next.projects[key].heroVideoSrc = HERO_BY_FOLDER[folder];
    }

    if (normalizeLookup(key) === "eapteka") {
      const heroSrc = next.projects[key].heroVideoSrc?.toLowerCase() ?? "";
      if (!heroSrc || heroSrc.includes("eapteka_thumb")) {
        next.projects[key].heroVideoSrc = "/materials/eapteka/sber_eapteka_hero.mp4";
      }
      if (!next.projects[key].materialsFolder) {
        next.projects[key].materialsFolder = "eapteka";
      }
    }

    if (normalizeLookup(key) === "lovegeneration") {
      next.projects[key].heroVideoSrc = "/materials/love-generation/love_generation (1080p)_1_prob4.mp4";
      if (!next.projects[key].materialsFolder) {
        next.projects[key].materialsFolder = "love-generation";
      }
    }
    if (normalizeLookup(key) === "mansi") {
      next.projects[key].title = "MANSI";
      if (!next.projects[key].materialsFolder) {
        next.projects[key].materialsFolder = "mansi";
      }
    }
    if (normalizeLookup(key) === "sobchak" && !next.projects[key].heroVideoSrc) {
      next.projects[key].heroVideoSrc = "/materials/sobchak/sobchak_hero.mp4";
    }
    if (normalizeLookup(key) === "mts" && !next.projects[key].heroVideoSrc) {
      next.projects[key].heroVideoSrc = "/materials/mts/mts_hero.mp4";
    }

    if (normalizeLookup(folder).includes("zvuk")) {
      const hasStoryboardSection = next.projects[key].sections.some(
        (section) =>
          normalizeLookup(section.id) === "storyboardsb" ||
          (section.header ?? "").toLowerCase().includes("раскадровка") ||
          (section.title ?? "").toLowerCase().includes("раскадровка")
      );
      if (!hasStoryboardSection) {
        next.projects[key].sections.push({
          id: "storyboard-sb",
          header: "Раскадровка",
          about: "",
          blocks: [
            {
              id: "storyboard-sb-grid",
              type: "row",
              row: {
                id: "storyboard-sb-items",
                layout: "grid-3",
                items: Array.from({ length: 27 }, (_, idx) => {
                  const n = idx + 1;
                  return {
                    id: `zvuk-sb-${String(n).padStart(2, "0")}`,
                    src: zvukStoryboardSrc(n),
                    alt: `ZVUK storyboard ${n}`,
                  };
                }),
              },
            },
          ],
        });
      }
    }

    if (normalizeLookup(folder).includes("rocs")) {
      const hasStoryboardSection = next.projects[key].sections.some(
        (section) =>
          normalizeLookup(section.id) === "storyboard-rocs" ||
          (section.header ?? "").toLowerCase().includes("раскадровка") ||
          (section.title ?? "").toLowerCase().includes("раскадровка")
      );
      if (!hasStoryboardSection) {
        next.projects[key].sections.push({
          id: "storyboard-rocs",
          header: "Раскадровка",
          about: "",
          blocks: [
            {
              id: "storyboard-rocs-grid",
              type: "row",
              row: {
                id: "storyboard-rocs-items",
                layout: "grid-3",
                items: Array.from({ length: 14 }, (_, idx) => {
                  const n = idx + 1;
                  return {
                    id: `rocs-sb-${String(n).padStart(2, "0")}`,
                    src: rocsStoryboardSrc(n),
                    alt: `R.O.C.S storyboard ${n}`,
                  };
                }),
              },
            },
          ],
        });
      }

      const hasSketchSection = next.projects[key].sections.some(
        (section) =>
          normalizeLookup(section.id) === "sketch-rocs" ||
          (section.header ?? "").toLowerCase().includes("скетч") ||
          (section.title ?? "").toLowerCase().includes("скетч")
      );
      if (!hasSketchSection) {
        next.projects[key].sections.push({
          id: "sketch-rocs",
          header: "Скетчи",
          about: "",
          blocks: [
            {
              id: "sketch-rocs-grid",
              type: "row",
              row: {
                id: "sketch-rocs-items",
                layout: "grid-3",
                items: Array.from({ length: 10 }, (_, idx) => {
                  const n = idx + 1;
                  return {
                    id: `rocs-sketch-${String(n).padStart(2, "0")}`,
                    src: rocsSketchSrc(n),
                    alt: `R.O.C.S sketch ${n}`,
                  };
                }),
              },
            },
          ],
        });
      }
    }

    if (normalizeLookup(folder).includes("uralsib")) {
      const hasCharactersSection = next.projects[key].sections.some(
        (section) =>
          normalizeLookup(section.id) === "characters-uralsib" ||
          (section.header ?? "").toLowerCase().includes("персонаж") ||
          (section.title ?? "").toLowerCase().includes("персонаж")
      );
      if (!hasCharactersSection) {
        next.projects[key].sections.push({
          id: "characters-uralsib",
          header: "Персонажи",
          about: "",
          blocks: [
            {
              id: "uralsib-characters-row-1",
              type: "row",
              row: {
                id: "uralsib-characters-items-1",
                layout: "row-3",
                items: [
                  { id: "uralsib-pers1-1", src: "/materials/uralsib/pers_sketch/pers1-1.jpg", alt: "Uralsib character sketch 1-1" },
                  { id: "uralsib-pers1-2", src: "/materials/uralsib/pers_sketch/pers1-2.jpg", alt: "Uralsib character sketch 1-2" },
                  { id: "uralsib-pers1-3", src: "/materials/uralsib/pers_sketch/pers1-3.jpg", alt: "Uralsib character sketch 1-3" },
                ],
              },
            },
            {
              id: "uralsib-characters-row-2",
              type: "row",
              row: {
                id: "uralsib-characters-items-2",
                layout: "row-3",
                items: [
                  { id: "uralsib-pers2-1", src: "/materials/uralsib/pers_sketch/pers2-1.jpg", alt: "Uralsib character sketch 2-1" },
                  { id: "uralsib-pers2-2", src: "/materials/uralsib/pers_sketch/pers2-2.jpg", alt: "Uralsib character sketch 2-2" },
                  { id: "uralsib-pers2-3", src: "/materials/uralsib/pers_sketch/pers2-3.png", alt: "Uralsib character sketch 2-3" },
                ],
              },
            },
            {
              id: "uralsib-characters-row-3",
              type: "row",
              row: {
                id: "uralsib-characters-items-3",
                layout: "row-3",
                items: [
                  { id: "uralsib-pers3-1", src: "/materials/uralsib/pers_sketch/pers3-1.jpg", alt: "Uralsib character sketch 3-1" },
                  { id: "uralsib-pers3-2", src: "/materials/uralsib/pers_sketch/pers3-2.jpg", alt: "Uralsib character sketch 3-2" },
                  { id: "uralsib-pers3-3", src: "/materials/uralsib/pers_sketch/pers3-3.jpg", alt: "Uralsib character sketch 3-3" },
                ],
              },
            },
            {
              id: "uralsib-characters-row-4",
              type: "row",
              row: {
                id: "uralsib-characters-items-4",
                layout: "row-1",
                items: [{ id: "uralsib-pers4", src: "/materials/uralsib/pers_sketch/pers4.jpg", alt: "Uralsib character sketch 4" }],
              },
            },
          ],
        });
      }
    }

    if (normalizeLookup(folder).includes("sberterminal")) {
      const hasTerminalSection = next.projects[key].sections.some(
        (section) =>
          normalizeLookup(section.id) === "terminal-sber" ||
          (section.header ?? "").toLowerCase().includes("терминал") ||
          (section.title ?? "").toLowerCase().includes("терминал")
      );
      if (!hasTerminalSection) {
        next.projects[key].sections.push({
          id: "terminal-sber",
          header: "Терминал",
          about: "",
          blocks: [
            {
              id: "terminal-sber-grid",
              type: "row",
              row: {
                id: "terminal-sber-grid-items",
                layout: "grid-3",
                items: [
                  {
                    id: "terminal-grid-1",
                    src: "/materials/sber-terminal/term_grid/photo_2026-03-09_15-05-06.jpg",
                    alt: "Sber terminal grid 1",
                  },
                  {
                    id: "terminal-grid-2",
                    src: "/materials/sber-terminal/term_grid/photo_2026-03-09_15-05-17.jpg",
                    alt: "Sber terminal grid 2",
                  },
                  {
                    id: "terminal-grid-3",
                    src: "/materials/sber-terminal/term_grid/photo_2026-03-09_15-05-20.jpg",
                    alt: "Sber terminal grid 3",
                  },
                  {
                    id: "terminal-grid-4",
                    src: "/materials/sber-terminal/term_grid/photo_2026-03-09_15-05-22.jpg",
                    alt: "Sber terminal grid 4",
                  },
                  {
                    id: "terminal-grid-5",
                    src: "/materials/sber-terminal/term_grid/photo_2026-03-09_15-05-23.jpg",
                    alt: "Sber terminal grid 5",
                  },
                  {
                    id: "terminal-grid-6",
                    src: "/materials/sber-terminal/term_grid/photo_2026-03-09_15-05-25.jpg",
                    alt: "Sber terminal grid 6",
                  },
                  {
                    id: "terminal-grid-7",
                    src: "/materials/sber-terminal/term_grid/photo_2026-03-09_15-05-27.jpg",
                    alt: "Sber terminal grid 7",
                  },
                  {
                    id: "terminal-grid-8",
                    src: "/materials/sber-terminal/term_grid/photo_2026-03-09_15-08-25.jpg",
                    alt: "Sber terminal grid 8",
                  },
                ],
              },
            },
            {
              id: "terminal-sber-row",
              type: "row",
              row: {
                id: "terminal-sber-row-items",
                layout: "row-3",
                items: [
                  { id: "terminal-row-1", src: "/materials/sber-terminal/term_row1/term-2-1.jpg", alt: "Sber terminal row 1" },
                  { id: "terminal-row-2", src: "/materials/sber-terminal/term_row1/term-2-2.jpg", alt: "Sber terminal row 2" },
                  { id: "terminal-row-3", src: "/materials/sber-terminal/term_row1/term-2-3.jpg", alt: "Sber terminal row 3" },
                ],
              },
            },
          ],
        });
      }
    }

    if (next.projects[key].introTexts.length === 0) {
      next.projects[key].introTexts = ["Project materials and process overview."];
    }
    if (next.projects[key].sections.length === 0 && THUMB_BY_FOLDER[folder]) {
      next.projects[key].sections.push({
        id: `${folder}-preview`,
        header: "Preview",
        about: "",
        blocks: [
          {
            id: `${folder}-preview-row`,
            type: "row",
            row: {
              id: `${folder}-preview-items`,
              layout: "row-1",
              items: [{ id: `${folder}-preview-item`, src: THUMB_BY_FOLDER[folder], alt: `${next.projects[key].title} preview` }],
            },
          },
        ],
      });
    }
    if (next.projects[key].sections.length === 0 || hasOnlyPreviewSection(next.projects[key])) {
      const autoSections = buildAutoMaterialsSections(folder, next.projects[key]);
      if (autoSections.length > 0) {
        for (const autoSection of autoSections) {
          const exists = next.projects[key].sections.some((section) => normalizeLookup(section.id) === normalizeLookup(autoSection.id));
          if (!exists) {
            next.projects[key].sections.push(autoSection);
          }
        }
      }
    }
  }

  for (const project of Object.values(next.projects)) {
    dedupeProjectSections(project);
  }

  return next;
}

export function normalizeSiteContent(content: SiteContent): SiteContent {
  return ensureRequiredProjects(content);
}

export function loadSiteContent(): SiteContent {
  if (typeof window === "undefined") {
    return normalizeSiteContent(cloneDefaultContent());
  }

  if (!LOCAL_STORAGE_CONTENT_ENABLED) {
    return normalizeSiteContent(cloneDefaultContent());
  }

  const raw = window.localStorage.getItem(SITE_CONTENT_KEY);
  if (!raw) {
    return normalizeSiteContent(cloneDefaultContent());
  }

  try {
    const parsed = JSON.parse(raw) as SiteContent;
    if (!parsed || typeof parsed !== "object") {
      return normalizeSiteContent(cloneDefaultContent());
    }
    const normalized = normalizeSiteContent(parsed);
    if (JSON.stringify(normalized) !== JSON.stringify(parsed)) {
      window.localStorage.setItem(SITE_CONTENT_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return normalizeSiteContent(cloneDefaultContent());
  }
}

export function saveSiteContent(content: SiteContent): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!LOCAL_STORAGE_CONTENT_ENABLED) {
    return;
  }
  window.localStorage.setItem(SITE_CONTENT_KEY, JSON.stringify(content));
  window.dispatchEvent(new CustomEvent(SITE_CONTENT_EVENT));
}

export function resetSiteContent(): SiteContent {
  const next = cloneDefaultContent();
  saveSiteContent(next);
  return next;
}
