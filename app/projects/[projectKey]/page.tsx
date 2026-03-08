import fs from "node:fs";
import path from "node:path";
import { defaultSiteContent } from "@/app/content/default-content";
import { canonicalProjectSlug, keyToSlug } from "@/app/content/project-helpers";
import { ProjectPageClient } from "./project-page-client";

export const dynamicParams = false;

function getMaterialFolderSlugs(): string[] {
  const materialsDir = path.join(process.cwd(), "public", "materials");
  try {
    return fs
      .readdirSync(materialsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => canonicalProjectSlug(entry.name))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function generateStaticParams() {
  const slugs = new Set<string>();

  for (const key of Object.keys(defaultSiteContent.projects)) {
    slugs.add(keyToSlug(key));
  }

  for (const card of defaultSiteContent.home.projects) {
    const match = card.href?.match(/^\/projects\/([^/?#]+)/i);
    if (match?.[1]) {
      slugs.add(match[1].toLowerCase());
    }
  }

  for (const materialSlug of getMaterialFolderSlugs()) {
    slugs.add(materialSlug);
  }

  return Array.from(slugs).map((projectKey) => ({ projectKey }));
}

export default async function DynamicProjectPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  return <ProjectPageClient slug={projectKey} />;
}
