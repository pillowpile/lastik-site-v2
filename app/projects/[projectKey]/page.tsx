import fs from "node:fs";
import path from "node:path";
import { defaultSiteContent } from "@/app/content/default-content";
import { HERO_BY_FOLDER, THUMB_BY_FOLDER, canonicalProjectSlug, keyToSlug, normalizeLookup } from "@/app/content/project-helpers";
import type { ProjectPageContent } from "@/app/content/types";
import { ProjectPageClient } from "./project-page-client";

export const dynamicParams = false;

function getMaterialFolderSlugs(): string[] {
  const materialsDir = path.join(process.cwd(), "public", "materials");
  try {
    return fs
      .readdirSync(materialsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => canonicalProjectSlug(entry.name))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function readMaterialsByFolder(): Record<string, string[]> {
  const indexPath = path.join(process.cwd(), "public", "materials-index.json");
  try {
    const raw = fs.readFileSync(indexPath, "utf8");
    const parsed = JSON.parse(raw) as { byFolder?: Record<string, unknown> };
    const source = parsed.byFolder ?? {};
    const next: Record<string, string[]> = {};
    for (const [folder, value] of Object.entries(source)) {
      if (!Array.isArray(value)) {
        continue;
      }
      next[canonicalProjectSlug(folder)] = value.filter((item): item is string => typeof item === "string");
    }
    return next;
  } catch {
    return {};
  }
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

function pickAutoHeroSrc(slug: string, project: ProjectPageContent, byFolder: Record<string, string[]>): string | undefined {
  if (project.heroVideoSrc) {
    return project.heroVideoSrc;
  }
  const folder = canonicalProjectSlug(project.materialsFolder ?? slug);
  const all = byFolder[folder] ?? [];
  const heroCandidate = all.find((src) => /hero\.(mp4|webm|mov)$/i.test(src));
  if (heroCandidate) {
    return heroCandidate;
  }
  return all.find((src) => /\.(mp4|webm|mov)$/i.test(src));
}

function buildAutoMaterialsSection(slug: string, project: ProjectPageContent, byFolder: Record<string, string[]>) {
  const folder = canonicalProjectSlug(project.materialsFolder ?? slug);
  const all = byFolder[folder] ?? [];
  if (all.length === 0) {
    return null;
  }
  const hero = (project.heroVideoSrc ?? "").toLowerCase();
  const thumb = (THUMB_BY_FOLDER[folder] ?? "").toLowerCase();
  const media = all
    .filter((src) => {
      const lower = src.toLowerCase();
      if (lower === hero || lower === thumb) {
        return false;
      }
      return /\.(mp4|webm|mov|jpg|jpeg|png|gif|avif|webp)$/i.test(lower);
    })
    .slice(0, 24);

  if (media.length === 0) {
    return null;
  }

  return {
    id: `${folder}-materials`,
    header: "Materials",
    about: "",
    blocks: [
      {
        id: `${folder}-materials-row`,
        type: "row" as const,
        row: {
          id: `${folder}-materials-items`,
          layout: inferLayoutByCount(media.length),
          items: media.map((src, index) => ({
            id: `${folder}-materials-${index + 1}`,
            src,
            alt: `${project.title} material ${index + 1}`,
          })),
        },
      },
    ],
  };
}

function buildProjectContentBySlug(): Record<string, ProjectPageContent> {
  const materialsByFolder = readMaterialsByFolder();
  const map: Record<string, ProjectPageContent> = {};
  for (const [projectKey, project] of Object.entries(defaultSiteContent.projects)) {
    map[keyToSlug(projectKey)] = structuredClone(project);
  }

  for (const card of defaultSiteContent.home.projects) {
    const match = card.href?.match(/^\/projects\/([^/?#]+)/i);
    if (!match?.[1]) {
      continue;
    }
    const slug = canonicalProjectSlug(match[1]);
    const existing = map[slug];
    if (existing) {
      continue;
    }
    const hero = HERO_BY_FOLDER[slug];
    const thumb = THUMB_BY_FOLDER[slug];
    map[slug] = {
      backLabel: "← Back to projects",
      title: card.title,
      materialsFolder: slug,
      referenceStyle: {
        mode: "site",
        useThisStyle: true,
        useSiteStyle: true,
      },
      heroVideoSrc: hero,
      introTexts: ["Project materials and process overview."],
      sections: [],
      thanksText: "",
    };
  }

  for (const [slug, project] of Object.entries(map)) {
    const folder = canonicalProjectSlug(project.materialsFolder ?? slug);
    project.referenceStyle = project.referenceStyle ?? { mode: "site", useThisStyle: true, useSiteStyle: true };
    if (!project.referenceStyle.mode) {
      project.referenceStyle.mode = "site";
    }
    if (!project.introTexts || project.introTexts.length === 0) {
      project.introTexts = ["Project materials and process overview."];
    }
    if (!project.heroVideoSrc && HERO_BY_FOLDER[folder]) {
      project.heroVideoSrc = HERO_BY_FOLDER[folder];
    }
    if (!project.heroVideoSrc) {
      project.heroVideoSrc = pickAutoHeroSrc(slug, project, materialsByFolder);
    }
    if (normalizeLookup(folder).includes("zvuk") && project.sections.length < 2) {
      project.sections.push({
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
                  src: n === 4 || n === 7 ? `/materials/zvuk/sb/${n}.jpg` : `/materials/zvuk/sb/${n}.png`,
                  alt: `ZVUK storyboard ${n}`,
                };
              }),
            },
          },
        ],
      });
    }
    if (normalizeLookup(folder).includes("rocs") && project.sections.length < 2) {
      project.sections.push({
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
                  src: `/materials/rocs/sb/${n}.png`,
                  alt: `R.O.C.S storyboard ${n}`,
                };
              }),
            },
          },
        ],
      });
    }
    if (normalizeLookup(folder).includes("uralsib")) {
      const hasCharactersSection = project.sections.some(
        (section) =>
          normalizeLookup(section.id) === "characters-uralsib" ||
          (section.header ?? "").toLowerCase().includes("персонаж") ||
          (section.title ?? "").toLowerCase().includes("персонаж")
      );
      if (!hasCharactersSection) {
        project.sections.push({
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
      const hasTerminalSection = project.sections.some(
        (section) =>
          normalizeLookup(section.id) === "terminal-sber" ||
          (section.header ?? "").toLowerCase().includes("терминал") ||
          (section.title ?? "").toLowerCase().includes("терминал")
      );
      if (!hasTerminalSection) {
        project.sections.push({
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
    if (project.sections.length === 0) {
      const autoSection = buildAutoMaterialsSection(slug, project, materialsByFolder);
      if (autoSection) {
        project.sections.push(autoSection);
      }
    }
  }
  return map;
}

export function generateStaticParams() {
  const slugs = new Set<string>();

  for (const key of Object.keys(defaultSiteContent.projects)) {
    slugs.add(keyToSlug(key));
  }

  for (const card of defaultSiteContent.home.projects) {
    const match = card.href?.match(/^\/projects\/([^/?#]+)/i);
    if (match?.[1]) {
      slugs.add(match[1].toLowerCase());
    }
  }

  for (const materialSlug of getMaterialFolderSlugs()) {
    slugs.add(materialSlug);
  }

  return Array.from(slugs).map((projectKey) => ({ projectKey }));
}

export default async function DynamicProjectPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const slug = canonicalProjectSlug(projectKey);
  const contentBySlug = buildProjectContentBySlug();
  const content = contentBySlug[slug];

  const fallback: ProjectPageContent = content ?? {
    backLabel: "← Back to projects",
    title: slug.toUpperCase(),
    materialsFolder: slug,
    referenceStyle: {
      mode: "site",
      useThisStyle: true,
      useSiteStyle: true,
    },
    heroVideoSrc: HERO_BY_FOLDER[slug],
    introTexts: ["Project materials and process overview."],
    sections: THUMB_BY_FOLDER[slug]
      ? [
          {
            id: `${slug}-preview`,
            header: "Preview",
            about: "",
            blocks: [
              {
                id: `${slug}-preview-row`,
                type: "row",
                row: {
                  id: `${slug}-preview-items`,
                  layout: "row-1",
                  items: [{ id: `${slug}-preview-media`, src: THUMB_BY_FOLDER[slug], alt: `${slug} preview` }],
                },
              },
            ],
          },
        ]
      : [],
    thanksText: "",
  };

  return <ProjectPageClient slug={slug} content={fallback} globalReferenceSiteUrl="https://pp-web2.netlify.app" />;
}
