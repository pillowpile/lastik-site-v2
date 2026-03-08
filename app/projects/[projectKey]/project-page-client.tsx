"use client";

import { CasePageView } from "@/app/components/case-page-view";
import { HERO_BY_FOLDER, THUMB_BY_FOLDER, canonicalProjectSlug, keyToSlug, normalizeLookup, projectContentScore, sanitizeProjectKey } from "@/app/content/project-helpers";
import { useSiteContent } from "@/app/content/use-site-content";
import type { ProjectPageContent } from "@/app/content/types";

function resolveProjectBySlug(projects: Record<string, ProjectPageContent>, slug: string): ProjectPageContent | null {
  const target = normalizeLookup(canonicalProjectSlug(slug));
  const targets = new Set<string>([target]);
  if (target === "mts") {
    targets.add("mtc");
  }
  if (target === "mtc") {
    targets.add("mts");
  }

  const direct = projects[slug];
  let bestCandidate: ProjectPageContent | null = direct ?? null;
  for (const [key, content] of Object.entries(projects)) {
    const byKey = normalizeLookup(key);
    const byKebab = normalizeLookup(keyToSlug(key));
    const byFolder = normalizeLookup(canonicalProjectSlug(sanitizeProjectKey(content.materialsFolder ?? "") || keyToSlug(key)));
    if (targets.has(byKey) || targets.has(byKebab) || targets.has(byFolder)) {
      if (!bestCandidate || projectContentScore(content) > projectContentScore(bestCandidate)) {
        bestCandidate = content;
      }
    }
  }
  if (bestCandidate) {
    return bestCandidate;
  }
  if (direct) {
    return direct;
  }
  if (projects[canonicalProjectSlug(slug)]) {
    const canonical = projects[canonicalProjectSlug(slug)];
    if (canonical) {
      return canonical;
    }
  }
  return null;
}

function buildFallbackProject(slug: string): ProjectPageContent {
  const folder = canonicalProjectSlug(slug);
  const heroVideoSrc = HERO_BY_FOLDER[folder];
  const thumbSrc = THUMB_BY_FOLDER[folder];
  const title = folder
    .split("-")
    .map((part) => part.toUpperCase())
    .join(" / ");
  return {
    backLabel: "← Back to projects",
    title: title || slug.toUpperCase(),
    materialsFolder: folder,
    referenceStyle: {
      mode: "site",
      useThisStyle: true,
      useSiteStyle: true,
    },
    heroVideoSrc,
    introTexts: ["Project materials and process overview."],
    sections:
      thumbSrc && !heroVideoSrc
        ? [
            {
              id: "preview",
              header: "Preview",
              blocks: [
                {
                  id: "preview-row",
                  type: "row",
                  row: {
                    id: "preview-row-1",
                    layout: "row-1",
                    items: [{ id: "preview-media", src: thumbSrc, alt: `${title} preview` }],
                  },
                },
              ],
            },
          ]
        : [],
    thanksText: "",
  };
}

export function ProjectPageClient({ slug }: { slug: string }) {
  const siteContent = useSiteContent();
  const content = resolveProjectBySlug(siteContent.projects, slug) ?? buildFallbackProject(slug);

  return <CasePageView content={content} globalReferenceSiteUrl={siteContent.home.referenceSiteUrl} />;
}
