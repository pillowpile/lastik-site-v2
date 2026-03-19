"use client";

import { CasePageView } from "@/app/components/case-page-view";
import { useSiteContent } from "@/app/content/use-site-content";

export default function VkMiniAppsProjectPage() {
  const siteContent = useSiteContent();

  return <CasePageView content={siteContent.projects.vkMiniApps} globalReferenceSiteUrl={siteContent.home.referenceSiteUrl} />;
}
