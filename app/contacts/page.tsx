"use client";

import { CasePageView } from "@/app/components/case-page-view";
import { useSiteContent } from "@/app/content/use-site-content";

export default function ContactsPage() {
  const siteContent = useSiteContent();
  return <CasePageView content={siteContent.specialPages.contacts} globalReferenceSiteUrl={siteContent.home.referenceSiteUrl} />;
}
