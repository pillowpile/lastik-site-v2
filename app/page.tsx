"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useSiteContent } from "@/app/content/use-site-content";
import type { ProjectTag } from "@/app/content/types";

const HOME_LAYOUT_PRESET: Array<{ top: number; left: number; width: number }> = [
  { top: 230, left: 0, width: 30 },
  { top: 545, left: 7, width: 27 },
  { top: 414, left: 37, width: 40 },
  { top: 790, left: 60, width: 30 },
  { top: 1030, left: 0, width: 41 },
  { top: 1030, left: 47, width: 31 },
  { top: 190, left: 42, width: 17 },
  { top: 205, left: 66, width: 17 },
  { top: 495, left: 83, width: 16 },
  { top: 1220, left: 74, width: 17 },
];

const FILTER_TAGS: Array<{ key: ProjectTag; label: string }> = [
  { key: "3d", label: "3D" },
  { key: "2d", label: "2D" },
  { key: "ai", label: "AI" },
  { key: "mix", label: "MIX" },
];

function hrefToProjectSlug(href?: string): string | null {
  if (!href) {
    return null;
  }
  const match = href.match(/^\/projects\/([^/?#]+)/i);
  return match ? match[1].toLowerCase() : null;
}

function cardKeyFromProject(title: string, href?: string): string {
  const byHref = hrefToProjectSlug(href);
  if (byHref) {
    return byHref.replace(/[^a-z0-9-]/g, "");
  }
  const fromTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return fromTitle || "untitled";
}

function folderKeyFromAsset(src?: string): string | null {
  if (!src) {
    return null;
  }
  const match = src.match(/\/materials\/([^/]+)/i);
  if (!match) {
    return null;
  }
  return match[1].toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function isYandexInclCard(project: { title: string; href?: string; thumbnailSrc?: string }): boolean {
  const thumb = (project.thumbnailSrc ?? "").toLowerCase();
  const href = (project.href ?? "").toLowerCase();
  const title = project.title.toLowerCase();
  return thumb.includes("/materials/yandex-incl/") || href.includes("/projects/yandex-incl") || title.includes("яндекс");
}

function mediaTypeFromSrc(src: string): "video" | "image" {
  const lower = src.toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov")) {
    return "video";
  }
  return "image";
}

function seedFromString(raw: string): number {
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFromSeed(seed: number): number {
  const next = (seed * 1664525 + 1013904223) >>> 0;
  return next / 4294967296;
}

function fallbackLayoutFromId(id: string): { top: number; left: number; width: number } {
  const seed = seedFromString(id);
  const r1 = randomFromSeed(seed);
  const r2 = randomFromSeed(seed ^ 0x9e3779b9);
  const r3 = randomFromSeed(seed ^ 0x85ebca6b);
  return {
    top: Math.round(140 + r1 * 1120),
    left: Number((2 + r2 * 80).toFixed(2)),
    width: Number((16 + r3 * 20).toFixed(2)),
  };
}

export default function Home() {
  const { home, projects } = useSiteContent();
  const thumbVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const thumbImageRefs = useRef<Record<string, HTMLImageElement | null>>({});
  const alphaMasksRef = useRef<Record<string, { width: number; height: number; data: Uint8ClampedArray }>>({});
  const alphaHitRef = useRef<Record<string, boolean>>({});
  const [flyEnabled, setFlyEnabled] = useState(true);
  const [flySpeed, setFlySpeed] = useState(0);
  const [layoutMode, setLayoutMode] = useState<"free" | "grid">("free");
  const [activeTags, setActiveTags] = useState<ProjectTag[]>([]);
  const [alphaHitByProject, setAlphaHitByProject] = useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = useState(false);

  const tagsBySlug = Object.entries(projects).reduce<Record<string, ProjectTag[]>>((acc, [key, value]) => {
    acc[key.toLowerCase()] = value.tags ?? [];
    const kebab = key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    acc[kebab] = value.tags ?? [];
    acc[kebab.replace("mini-apps", "miniapps")] = value.tags ?? [];
    return acc;
  }, {});

  const projectsWithTags = home.projects.map((projectCard, index) => {
    const slug = hrefToProjectSlug(projectCard.href);
    const tags = slug ? tagsBySlug[slug] ?? [] : [];
    const matched = activeTags.length === 0 || activeTags.some((tag) => tags.includes(tag));
    return {
      project: projectCard,
      index,
      tags,
      matched,
    };
  });

  const orderedProjects = activeTags.length === 0
    ? projectsWithTags
    : [...projectsWithTags].sort((a, b) => Number(b.matched) - Number(a.matched));

  useEffect(() => {
    const saved = window.localStorage.getItem("lastik.home.fly-enabled");
    if (saved === "0") {
      setFlyEnabled(false);
    }
    const savedSpeed = window.localStorage.getItem("lastik.home.fly-speed");
    if (savedSpeed) {
      const nextSpeed = Number(savedSpeed);
      if (Number.isFinite(nextSpeed)) {
        setFlySpeed(Math.min(100, Math.max(0, nextSpeed)));
      }
    }
    const savedLayoutMode = window.localStorage.getItem("lastik.home.layout-mode");
    if (savedLayoutMode === "grid" || savedLayoutMode === "free") {
      setLayoutMode(savedLayoutMode);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("lastik.home.fly-enabled", flyEnabled ? "1" : "0");
  }, [flyEnabled]);

  useEffect(() => {
    window.localStorage.setItem("lastik.home.fly-speed", String(flySpeed));
  }, [flySpeed]);

  useEffect(() => {
    window.localStorage.setItem("lastik.home.layout-mode", layoutMode);
  }, [layoutMode]);

  function setThumbVideoRef(projectId: string, element: HTMLVideoElement | null) {
    thumbVideoRefs.current[projectId] = element;
  }

  function setThumbImageRef(projectId: string, element: HTMLImageElement | null) {
    thumbImageRefs.current[projectId] = element;
  }

  function setAlphaHit(projectId: string, next: boolean) {
    if (alphaHitRef.current[projectId] === next) {
      return;
    }
    alphaHitRef.current[projectId] = next;
    setAlphaHitByProject((prev) => ({ ...prev, [projectId]: next }));
  }

  function cacheAlphaMask(projectId: string) {
    const img = thumbImageRefs.current[projectId];
    if (!img || !img.naturalWidth || !img.naturalHeight) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return;
    }
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    alphaMasksRef.current[projectId] = {
      width: canvas.width,
      height: canvas.height,
      data: imageData.data,
    };
  }

  function isOpaqueImagePoint(projectId: string, clientX: number, clientY: number): boolean {
    const img = thumbImageRefs.current[projectId];
    const mask = alphaMasksRef.current[projectId];
    if (!img || !mask) {
      return true;
    }

    const rect = img.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return false;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const scale = Math.min(rect.width / mask.width, rect.height / mask.height);
    const drawWidth = mask.width * scale;
    const drawHeight = mask.height * scale;
    const offsetX = (rect.width - drawWidth) / 2;
    const offsetY = (rect.height - drawHeight) / 2;

    const srcX = Math.floor((x - offsetX) / scale);
    const srcY = Math.floor((y - offsetY) / scale);

    if (srcX < 0 || srcY < 0 || srcX >= mask.width || srcY >= mask.height) {
      return false;
    }

    const alpha = mask.data[(srcY * mask.width + srcX) * 4 + 3];
    return alpha > 8;
  }

  function onImagePointerMove(projectId: string, clientX: number, clientY: number) {
    setAlphaHit(projectId, isOpaqueImagePoint(projectId, clientX, clientY));
  }

  function clickThroughAtPoint(linkEl: HTMLAnchorElement, clientX: number, clientY: number) {
    const previousPointerEvents = linkEl.style.pointerEvents;
    linkEl.style.pointerEvents = "none";
    const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    linkEl.style.pointerEvents = previousPointerEvents;
    if (!target) {
      return;
    }
    const interactive = target.closest("a, button, [role='button']") as HTMLElement | null;
    if (interactive) {
      interactive.click();
    }
  }

  function playOnlyHovered(projectId: string) {
    for (const [id, video] of Object.entries(thumbVideoRefs.current)) {
      if (!video) {
        continue;
      }
      if (id === projectId) {
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  }

  function pauseHovered(projectId: string) {
    const video = thumbVideoRefs.current[projectId];
    if (video) {
      video.pause();
    }
  }

  return (
    <main className={`collage-page ${flyEnabled ? "collage-fly-on" : "collage-fly-off"} collage-layout-${layoutMode}`}>
      <nav className="collage-topbar" aria-label="Фильтры и страницы">
        <div className="collage-tag-filters">
          {FILTER_TAGS.map((item) => {
            const isActive = activeTags.includes(item.key);
            return (
              <button
                key={item.key}
                className={`collage-tag-filter ${isActive ? "active" : ""}`}
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
        <div className="collage-top-links">
          <Link href="/artdir-kurs">АРТДИР КУРС</Link>
          <Link href="/studio">ПРО СТУДИЮ</Link>
          <Link href="/contacts">КОНТАКТЫ</Link>
        </div>
      </nav>
      <section className="collage-stage" aria-label="Карточки проектов">
        <div className="collage-stage-title" aria-hidden="true">
          {home.heroTitle}
        </div>
        {isMounted
          ? orderedProjects.map(({ project, index, matched }, orderIndex) => {
          const thumbnailType = project.thumbnailSrc ? mediaTypeFromSrc(project.thumbnailSrc) : null;
          const thumbnailSrc = (project.thumbnailSrc ?? "").toLowerCase();
          const projectHref = (project.href ?? "").toLowerCase();
          const yandexCard = isYandexInclCard(project);
          const folderKey = folderKeyFromAsset(project.thumbnailSrc);
          const zoomFactor = thumbnailSrc.includes("sber-terminal") || projectHref.includes("sber-terminal")
            ? 1.18
            : thumbnailSrc.includes("eapteka_thumb") || thumbnailSrc.includes("rocs_thumb")
              ? 1.08
              : 1;
          const shouldZoomThumbnail = zoomFactor > 1;
          const baseLayout = project.layout ?? HOME_LAYOUT_PRESET[index] ?? fallbackLayoutFromId(project.id);
          const layout =
            activeTags.length > 0
              ? matched
                ? {
                    top: 120 + Math.floor(orderIndex / 4) * 220,
                    left: 2 + (orderIndex % 4) * 24,
                    width: 22,
                  }
                : {
                    ...baseLayout,
                    top: baseLayout.top + 320,
                  }
              : baseLayout;
          const floatSeed = seedFromString(`${project.id}-float`);
          const driftX = (randomFromSeed(floatSeed) - 0.5) * (yandexCard ? 18 : 90);
          const driftY = (randomFromSeed(floatSeed ^ 0x7f4a7c15) - 0.5) * (yandexCard ? 16 : 74);
          const driftScale = 0.82 + randomFromSeed(floatSeed ^ 0x6b8b4567) * 0.52;
          const baseDuration = 12 + randomFromSeed(floatSeed ^ 0x9e3779b9) * 14;
          const speedMultiplier = 1 - (flySpeed / 100) * 0.82;
          const driftDuration = baseDuration * speedMultiplier;
          const driftDelay = -randomFromSeed(floatSeed ^ 0x85ebca6b) * driftDuration;
          const floatVars = {
            "--float-x": `${driftX.toFixed(2)}px`,
            "--float-y": `${driftY.toFixed(2)}px`,
            "--float-scale": driftScale.toFixed(3),
            "--float-duration": `${driftDuration.toFixed(2)}s`,
            "--float-delay": `${driftDelay.toFixed(2)}s`,
          } as Record<string, string>;
          const cardStyle =
            layoutMode === "free"
              ? ({
                  top: `${layout.top}px`,
                  left: `${Math.min(layout.left, Math.max(0, 96 - (yandexCard ? layout.width * 2 : layout.width)))}%`,
                  width: `${yandexCard ? layout.width * 2 : layout.width}%`,
                  ...floatVars,
                } as CSSProperties)
              : (floatVars as unknown as CSSProperties);
          const imageHit = alphaHitByProject[project.id] ?? true;
          const media = project.thumbnailSrc ? (
            <div
              className={`media-surface ${
                thumbnailType === "image" ? (imageHit ? "alpha-hit" : "alpha-miss") : "alpha-hit"
              }`}
              aria-label={`Превью проекта ${project.title}`}
              style={{ "--thumb-zoom": zoomFactor.toFixed(2) } as CSSProperties}
              onMouseEnter={() => playOnlyHovered(project.id)}
              onMouseLeave={() => {
                pauseHovered(project.id);
                setAlphaHit(project.id, false);
              }}
              onPointerEnter={(e) => {
                if (thumbnailType === "image") {
                  onImagePointerMove(project.id, e.clientX, e.clientY);
                } else {
                  setAlphaHit(project.id, true);
                }
              }}
              onPointerMove={(e) => {
                if (thumbnailType === "image") {
                  onImagePointerMove(project.id, e.clientX, e.clientY);
                } else {
                  setAlphaHit(project.id, true);
                }
              }}
            >
              {thumbnailType === "video" ? (
                <video
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  ref={(el) => setThumbVideoRef(project.id, el)}
                  className={`media-thumb ${shouldZoomThumbnail ? "media-thumb-zoomed" : ""}`}
                >
                  <source src={project.thumbnailSrc} />
                </video>
              ) : (
                <img
                  src={project.thumbnailSrc}
                  alt={project.title}
                  ref={(el) => setThumbImageRef(project.id, el)}
                  onLoad={() => {
                    cacheAlphaMask(project.id);
                    setAlphaHit(project.id, true);
                  }}
                  className="media-thumb-image"
                />
              )}
            </div>
          ) : (
            <div className="media-placeholder" aria-label="Плейсхолдер проекта">
              <span>PLACEHOLDER {String(index + 1).padStart(2, "0")}</span>
            </div>
          );
          const card = (
            <>
              {media}
              <p className="project-tag">{project.title}</p>
            </>
          );

          const cardKey = cardKeyFromProject(project.title, project.href);
          return (
            <article
              className={`collage-card card-key-${cardKey} ${folderKey ? `card-folder-${folderKey}` : ""} ${yandexCard ? "card-yandex-incl" : ""} ${project.shape} tone-${project.tone} ${
                thumbnailType === "image" ? "card-object card-object-alpha" : "card-object"
              }`}
              key={project.id}
              style={cardStyle}
            >
              {project.href ? (
                <>
                  <Link
                    className={`collage-card-link ${
                      thumbnailType === "image" ? (imageHit ? "alpha-hit" : "alpha-miss") : "alpha-hit"
                    }`}
                    href={project.href}
                    aria-label={`Открыть проект ${project.title}`}
                    style={thumbnailType === "image" && !imageHit ? { cursor: "default" } : undefined}
                    onClick={(e) => {
                      if (thumbnailType === "image" && !imageHit) {
                        e.preventDefault();
                        clickThroughAtPoint(e.currentTarget, e.clientX, e.clientY);
                      }
                    }}
                  >
                    {media}
                  </Link>
                  <Link className="project-tag-link" href={project.href} aria-label={`Открыть проект ${project.title}`}>
                    <p className="project-tag">{project.title}</p>
                  </Link>
                </>
              ) : (
                card
              )}
            </article>
          );
        })
          : null}
      </section>

      <footer className="collage-footer">
        <p>{home.footerText}</p>
        <div className="collage-fly-controls">
          <button
            className="collage-fly-toggle"
            onClick={() => setLayoutMode((prev) => (prev === "free" ? "grid" : "free"))}
            type="button"
          >
            {layoutMode === "grid" ? "Режим: Сетка" : "Режим: Свободно"}
          </button>
          <button className="collage-fly-toggle" onClick={() => setFlyEnabled((prev) => !prev)} type="button">
            {flyEnabled ? "Летает" : "Статично"}
          </button>
          <label className="collage-fly-speed">
            <span>Скорость</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={flySpeed}
              onChange={(e) => setFlySpeed(Number(e.target.value))}
            />
          </label>
        </div>
      </footer>
    </main>
  );
}
