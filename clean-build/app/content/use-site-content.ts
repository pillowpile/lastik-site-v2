"use client";

import { useEffect, useState } from "react";
import { cloneDefaultContent, loadSiteContent, normalizeSiteContent, SITE_CONTENT_EVENT } from "./storage";
import type { SiteContent } from "./types";

export function useSiteContent(): SiteContent {
  const [content, setContent] = useState<SiteContent>(() => normalizeSiteContent(cloneDefaultContent()));

  useEffect(() => {
    setContent(loadSiteContent());

    const sync = () => setContent(loadSiteContent());

    window.addEventListener(SITE_CONTENT_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(SITE_CONTENT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return content;
}
