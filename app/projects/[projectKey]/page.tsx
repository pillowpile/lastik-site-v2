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

function buildProjectContentBySlug(): Record<string, ProjectPageContent> {
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
      sections: thumb
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
                    items: [{ id: `${slug}-preview-media`, src: thumb, alt: `${card.title} preview` }],
                  },
                },
              ],
            },
          ]
        : [],
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
    if ((!project.sections || project.sections.length === 0) && THUMB_BY_FOLDER[folder]) {
      project.sections = [
        {
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
                items: [{ id: `${folder}-preview-media`, src: THUMB_BY_FOLDER[folder], alt: `${project.title} preview` }],
              },
            },
          ],
        },
      ];
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

  return <ProjectPageClient content={fallback} globalReferenceSiteUrl="https://pp-web2.netlify.app" />;
}
