import { CasePageView } from "@/app/components/case-page-view";
import { defaultSiteContent } from "@/app/content/default-content";

export default function VkMiniAppsProjectPage() {
  return <CasePageView content={defaultSiteContent.projects.vkMiniApps} globalReferenceSiteUrl="https://pp-web2.netlify.app" />;
}
