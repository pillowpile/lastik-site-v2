"use client";

import { CasePageView } from "@/app/components/case-page-view";
import { useSiteContent } from "@/app/content/use-site-content";

export default function StudioPage() {
  const siteContent = useSiteContent();
  return <CasePageView content={siteContent.specialPages.studio} globalReferenceSiteUrl={siteContent.home.referenceSiteUrl} />;
}
