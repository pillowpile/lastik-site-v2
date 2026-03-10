"use client";

import { defaultSiteContent } from "./default-content";
import { HERO_BY_FOLDER, THUMB_BY_FOLDER, canonicalProjectSlug, keyToSlug, normalizeAssetPath, normalizeLookup, projectContentScore, sanitizeProjectKey } from "./project-helpers";
import type { ProjectPageContent, SiteContent } from "./types";

export const SITE_CONTENT_KEY = "lastik.siteContent.v1";
export const SITE_CONTENT_EVENT = "site-content-updated";
const DEFAULT_REFERENCE_SITE_URL = "https://pp-web2.netlify.app";
const LOCAL_STORAGE_CONTENT_ENABLED = process.env.NEXT_PUBLIC_SITE_CONTENT_SOURCE === "local-storage";

function shouldUseLocalStorageContent(): boolean {
  if (LOCAL_STORAGE_CONTENT_ENABLED) {
    return true;
  }
  if (typeof window === "undefined") {
    return false;
  }
  return window.location.pathname.startsWith("/editor");
}

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
};
const HOME_CARD_TITLE_BY_ID: Record<string, string> = {
  p1: "VK / NEO",
};

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
      const forcedSlug = HOME_CARD_SLUG_BY_ID[card.id];
      const projectSlug = hrefToProjectSlug(card.href);
      const titleFallbackSlug =
        canonicalProjectSlug(card.title) || canonicalProjectSlug(card.id) || canonicalProjectSlug(card.href ?? "");
      const effectiveSlug = projectSlug || forcedSlug || titleFallbackSlug;
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
          thumbnailSrc: normalizedThumb || defaultRocsCard.thumbnailSrc,
          ...(canonicalHref ? { href: canonicalHref } : {}),
        };
      }
      if (card.id === "p5" || card.title.toLowerCase().includes("собчак")) {
        return {
          ...card,
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
          ...(normalizedThumb || THUMB_BY_FOLDER.uralsib ? { thumbnailSrc: normalizedThumb || THUMB_BY_FOLDER.uralsib } : {}),
          href: "/projects/uralsib",
        };
      }
      return {
        ...card,
        ...(HOME_CARD_TITLE_BY_ID[card.id] ? { title: HOME_CARD_TITLE_BY_ID[card.id] } : {}),
        ...(shouldNormalizeNeoTitle ? { title: "VK / NEO" } : {}),
        ...(normalizedThumb || fallbackThumb ? { thumbnailSrc: normalizedThumb || fallbackThumb } : {}),
        href: canonicalHref,
      };
    });

    const deduped: typeof normalizedCards = [];
    const hrefToIndex = new Map<string, number>();
    for (const card of normalizedCards) {
      if (!card.href?.startsWith("/projects/")) {
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
      hrefToIndex.set(card.href, deduped.length);
      deduped.push(card);
    }
    next.home.projects = deduped;

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

  if (!shouldUseLocalStorageContent()) {
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
  if (!shouldUseLocalStorageContent()) {
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
