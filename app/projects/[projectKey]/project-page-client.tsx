"use client";

import { CasePageView } from "@/app/components/case-page-view";
import type { ProjectPageContent } from "@/app/content/types";
export function ProjectPageClient({
  content,
  globalReferenceSiteUrl,
}: {
  content: ProjectPageContent;
  globalReferenceSiteUrl?: string;
}) {
  return <CasePageView content={content} globalReferenceSiteUrl={globalReferenceSiteUrl} />;
}
