"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSiteContent } from "@/app/content/use-site-content";
import type { ProjectTag } from "@/app/content/types";
import styles from "./home-grid.module.css";

const FILTER_TAGS: Array<{ key: ProjectTag; label: string }> = [
  { key: "3d", label: "3D" },
  { key: "2d", label: "2D" },
  { key: "ai", label: "AI" },
  { key: "mix", label: "MIX" },
];

function mediaTypeFromSrc(src: string): "video" | "image" {
  const lower = src.toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov")) {
    return "video";
  }
  return "image";
}

function slugFromHref(href?: string): string | null {
  if (!href) return null;
  const match = href.match(/^\/projects\/([^/?#]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export default function Home() {
  const { home, projects } = useSiteContent();
  const [activeTags, setActiveTags] = useState<ProjectTag[]>([]);

  const tagsBySlug = useMemo(() => {
    const map: Record<string, ProjectTag[]> = {};
    for (const [key, value] of Object.entries(projects)) {
      const byKey = key.toLowerCase();
      const kebab = key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
      map[byKey] = value.tags ?? [];
      map[kebab] = value.tags ?? [];
      map[kebab.replace("mini-apps", "miniapps")] = value.tags ?? [];
    }
    return map;
  }, [projects]);

  const cards = useMemo(() => {
    return home.projects.filter((card) => {
      if (activeTags.length === 0) return true;
      const slug = slugFromHref(card.href);
      const tags = slug ? tagsBySlug[slug] ?? [] : [];
      return activeTags.some((tag) => tags.includes(tag));
    });
  }, [home.projects, activeTags, tagsBySlug]);

  return (
    <main className={styles.page}>
      <nav className={styles.topbar} aria-label="Filters and pages">
        <div className={styles.filters}>
          {FILTER_TAGS.map((item) => {
            const isActive = activeTags.includes(item.key);
            return (
              <button
                key={item.key}
                className={`${styles.filter} ${isActive ? styles.filterActive : ""}`}
                onClick={() =>
                  setActiveTags((prev) => (prev.includes(item.key) ? prev.filter((tag) => tag !== item.key) : [...prev, item.key]))
                }
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <div className={styles.links}>
          <Link className={styles.link} href="/artdir-kurs">
            АРТДИР КУРС
          </Link>
          <Link className={styles.link} href="/studio">
            ПРО СТУДИЮ
          </Link>
          <Link className={styles.link} href="/contacts">
            КОНТАКТЫ
          </Link>
        </div>
      </nav>

      <h1 className={styles.hero}>{home.heroTitle}</h1>

      <section className={styles.grid} aria-label="Project cards">
        {cards.map((project, index) => {
          const media = project.thumbnailSrc ? (
            mediaTypeFromSrc(project.thumbnailSrc) === "video" ? (
              <video autoPlay loop muted playsInline preload="metadata">
                <source src={project.thumbnailSrc} />
              </video>
            ) : (
              <img src={project.thumbnailSrc} alt={project.title} />
            )
          ) : null;

          const key = `${project.id}-${project.href ?? index}`;

          return (
            <article className={styles.card} key={key}>
              {project.href ? (
                <Link className={styles.mediaLink} href={project.href} aria-label={`Open project ${project.title}`}>
                  {media}
                </Link>
              ) : (
                <div className={styles.media}>{media}</div>
              )}

              {project.href ? (
                <Link className={styles.tagLink} href={project.href}>
                  {project.title}
                </Link>
              ) : (
                <span className={styles.tag}>{project.title}</span>
              )}
            </article>
          );
        })}
      </section>

      <footer className={styles.footer}>{home.footerText}</footer>
    </main>
  );
}
