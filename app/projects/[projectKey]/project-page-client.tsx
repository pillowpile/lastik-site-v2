"use client";

import { CasePageView } from "@/app/components/case-page-view";
import { canonicalProjectSlug, keyToSlug, normalizeLookup, projectContentScore, sanitizeProjectKey } from "@/app/content/project-helpers";
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
  for (const [key, value] of Object.entries(projects)) {
    const byKey = normalizeLookup(key);
    const bySlug = normalizeLookup(keyToSlug(key));
    const byFolder = normalizeLookup(canonicalProjectSlug(sanitizeProjectKey(value.materialsFolder ?? "") || keyToSlug(key)));
    if (targets.has(byKey) || targets.has(bySlug) || targets.has(byFolder)) {
      if (!bestCandidate || projectContentScore(value) > projectContentScore(bestCandidate)) {
        bestCandidate = value;
      }
    }
  }
  return bestCandidate;
}

export function ProjectPageClient({
  slug,
  content,
  globalReferenceSiteUrl,
}: {
  slug: string;
  content: ProjectPageContent;
  globalReferenceSiteUrl?: string;
}) {
  const siteContent = useSiteContent();
  const resolvedContent = process.env.NODE_ENV !== "production" ? resolveProjectBySlug(siteContent.projects, slug) ?? content : content;
  const resolvedReferenceSiteUrl = process.env.NODE_ENV !== "production" ? siteContent.home.referenceSiteUrl || globalReferenceSiteUrl : globalReferenceSiteUrl;
  return <CasePageView content={resolvedContent} globalReferenceSiteUrl={resolvedReferenceSiteUrl} />;
}
