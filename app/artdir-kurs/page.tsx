"use client";

import { CasePageView } from "@/app/components/case-page-view";
import { useSiteContent } from "@/app/content/use-site-content";

export default function ArtdirCoursePage() {
  const siteContent = useSiteContent();
  return <CasePageView content={siteContent.specialPages.artdirCourse} globalReferenceSiteUrl={siteContent.home.referenceSiteUrl} />;
}
