"use client";

import { useParams } from "next/navigation";
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

export default function DynamicProjectPage() {
  const params = useParams<{ projectKey: string }>();
  const slug = params.projectKey ?? "";
  const siteContent = useSiteContent();
  const content = resolveProjectBySlug(siteContent.projects, slug);

  if (!content) {
    return (
      <main className="miniapps-case">
        <div className="miniapps-shell miniapps-container">
          <p className="miniapps-text">Project not found</p>
        </div>
      </main>
    );
  }

  return <CasePageView content={content} globalReferenceSiteUrl={siteContent.home.referenceSiteUrl} />;
}
