"use client";

import { useEffect, useState } from "react";
import { CasePageView } from "@/app/components/case-page-view";
import { canonicalProjectSlug, keyToSlug, normalizeLookup, projectContentScore, sanitizeProjectKey } from "@/app/content/project-helpers";
import { useSiteContent } from "@/app/content/use-site-content";
import type { HomeProjectCard, ProjectPageContent } from "@/app/content/types";

function sectionMediaMentionsSlug(project: ProjectPageContent, slugPathNeedle: string): boolean {
  for (const section of project.sections) {
    for (const block of section.blocks) {
      if (block.type !== "row") {
        continue;
      }
      for (const item of block.row.items) {
        if ((item.src ?? "").toLowerCase().includes(slugPathNeedle)) {
          return true;
        }
      }
    }
  }
  return false;
}

function contentLooksLikeSlug(project: ProjectPageContent, slug: string, homeProjects: HomeProjectCard[]): boolean {
  const canonicalSlug = canonicalProjectSlug(slug);
  const target = normalizeLookup(canonicalSlug);
  const slugPathNeedle = `/materials/${canonicalSlug}/`;

  const folder = canonicalProjectSlug(sanitizeProjectKey(project.materialsFolder ?? ""));
  if (normalizeLookup(folder) === target) {
    return true;
  }

  const hero = (project.heroVideoSrc ?? "").toLowerCase();
  if (hero.includes(slugPathNeedle)) {
    return true;
  }

  if (sectionMediaMentionsSlug(project, slugPathNeedle)) {
    return true;
  }

  const homeCard = homeProjects.find((item) => {
    const match = item.href?.match(/^\/projects\/([^/?#]+)/i);
    return match ? normalizeLookup(canonicalProjectSlug(match[1])) === target : false;
  });
  const homeCardTitle = normalizeLookup(homeCard?.title ?? "");
  const projectTitle = normalizeLookup(project.title ?? "");
  return Boolean(homeCardTitle && projectTitle === homeCardTitle);
}

function resolveProjectBySlug(
  projects: Record<string, ProjectPageContent>,
  slug: string,
  homeProjects: HomeProjectCard[]
): ProjectPageContent | null {
  const target = normalizeLookup(canonicalProjectSlug(slug));
  const targets = new Set<string>([target]);
  if (target === "mts") {
    targets.add("mtc");
  }
  if (target === "mtc") {
    targets.add("mts");
  }

  const direct = projects[slug];
  const slugPathNeedle = `/materials/${canonicalProjectSlug(slug)}/`;
  const directScore = direct ? projectContentScore(direct) : -1;
  const homeCard = homeProjects.find((item) => {
    const match = item.href?.match(/^\/projects\/([^/?#]+)/i);
    return match ? normalizeLookup(canonicalProjectSlug(match[1])) === target : false;
  });
  const homeCardTitle = normalizeLookup(homeCard?.title ?? "");

  let bestByAssetPath: ProjectPageContent | null = null;
  let bestByAssetPathScore = -1;
  for (const value of Object.values(projects)) {
    const folder = canonicalProjectSlug(sanitizeProjectKey(value.materialsFolder ?? ""));
    const hero = (value.heroVideoSrc ?? "").toLowerCase();
    const title = normalizeLookup(value.title ?? "");
    const mediaMention = sectionMediaMentionsSlug(value, slugPathNeedle);
    const byHomeTitle = homeCardTitle.length > 0 && title === homeCardTitle;
    if (folder !== canonicalProjectSlug(slug) && !hero.includes(slugPathNeedle) && !mediaMention && !byHomeTitle) {
      continue;
    }
    const score = projectContentScore(value);
    if (score > bestByAssetPathScore) {
      bestByAssetPath = value;
      bestByAssetPathScore = score;
    }
  }
  if (bestByAssetPath && bestByAssetPathScore >= directScore) {
    return bestByAssetPath;
  }
  if (direct) {
    return direct;
  }

  let bestExactCandidate: ProjectPageContent | null = null;
  let bestExactScore = -1;
  let bestCandidate: ProjectPageContent | null = null;
  let bestScore = -1;
  for (const [key, value] of Object.entries(projects)) {
    const byKey = normalizeLookup(key);
    const bySlug = normalizeLookup(keyToSlug(key));
    const byFolder = normalizeLookup(canonicalProjectSlug(sanitizeProjectKey(value.materialsFolder ?? "") || keyToSlug(key)));
    if (!(targets.has(byKey) || targets.has(bySlug) || targets.has(byFolder))) {
      continue;
    }

    const score = projectContentScore(value);
    const isExact = byKey === target || bySlug === target || byFolder === target;
    if (isExact && score > bestExactScore) {
      bestExactCandidate = value;
      bestExactScore = score;
      continue;
    }
    if (score > bestScore) {
      bestCandidate = value;
      bestScore = score;
    }
  }
  return bestExactCandidate ?? bestCandidate;
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
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isLocalBrowser = typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  const useLocalStorageSource = process.env.NEXT_PUBLIC_SITE_CONTENT_SOURCE === "local-storage" || isLocalBrowser;
  const canUseLocal = isMounted && useLocalStorageSource;
  const localResolved = canUseLocal ? resolveProjectBySlug(siteContent.projects, slug, siteContent.home.projects) : null;
  const localMatchesSlug = localResolved ? contentLooksLikeSlug(localResolved, slug, siteContent.home.projects) : false;
  const resolvedContent =
    localResolved && localMatchesSlug && projectContentScore(localResolved) >= projectContentScore(content) ? localResolved : content;
  const resolvedReferenceSiteUrl = canUseLocal ? siteContent.home.referenceSiteUrl || globalReferenceSiteUrl : globalReferenceSiteUrl;
  return <CasePageView content={resolvedContent} globalReferenceSiteUrl={resolvedReferenceSiteUrl} />;
}
