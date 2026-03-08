"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import { analyzeReferenceStyle } from "@/app/content/reference-style";
import type { ContentRow, MediaItem, ProjectPageContent, SectionBlock } from "@/app/content/types";

function videoMimeType(src: string): string {
  const lower = src.toLowerCase();
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/quicktime";
  return "video/mp4";
}

function mediaTypeFromSrc(src: string): "video" | "image" {
  const lower = src.toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov")) {
    return "video";
  }
  return "image";
}

function rowClass(row: ContentRow): string {
  const layout = row.layout;
  switch (layout) {
    case "row-1":
      return "miniapps-group-row-1";
    case "row-2":
      return "miniapps-group-row-2";
    case "row-3":
      return "miniapps-group-row-3";
    default:
      return `miniapps-grid-${Math.min(6, Math.max(2, row.gridCols ?? 3))}`;
  }
}

function renderMedia(item: MediaItem) {
  const type = item.type ?? mediaTypeFromSrc(item.src);
  if (type === "video") {
    return (
      <video autoPlay loop muted playsInline preload="metadata">
        <source src={item.src} type={videoMimeType(item.src)} />
      </video>
    );
  }
  return <img alt={item.alt} src={item.src} />;
}

function renderBlock(block: SectionBlock) {
  if (block.type === "text") {
    return <p className="miniapps-text">{block.text}</p>;
  }
  if (block.type === "subheading") {
    return <h3>{block.text}</h3>;
  }
  const row = block.row;
  const classNames = [
    row.layout.startsWith("row") ? "miniapps-group-row" : "miniapps-grid",
    rowClass(row),
    row.equalHeight ? "miniapps-group-equal" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classNames}>
      {row.items.map((item) => (
        <figure className="miniapps-card" key={item.id} style={item.ar ? ({ "--ar": item.ar } as CSSProperties) : undefined}>
          {renderMedia(item)}
        </figure>
      ))}
    </div>
  );
}

type CasePageViewProps = {
  content: ProjectPageContent;
  globalReferenceSiteUrl?: string;
};

export function CasePageView({ content, globalReferenceSiteUrl }: CasePageViewProps) {
  const [heroMuted, setHeroMuted] = useState(true);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  function toggleHeroMuted() {
    const nextMuted = !heroMuted;
    setHeroMuted(nextMuted);
    if (heroVideoRef.current) {
      heroVideoRef.current.muted = nextMuted;
    }
  }

  const referenceMode =
    content.referenceStyle?.mode ??
    (content.referenceStyle?.useThisStyle ? (content.referenceStyle?.useSiteStyle === false ? "random" : "site") : "default");
  const globalRef = globalReferenceSiteUrl?.trim() ?? "";
  const effectiveReferenceMode = globalRef ? "site" : referenceMode;
  const effectiveReferenceSiteUrl = globalRef || content.referenceStyle?.siteUrl;
  const refStyle = analyzeReferenceStyle(effectiveReferenceSiteUrl, content.referenceStyle?.styleName, effectiveReferenceMode);

  return (
    <main
      className={refStyle.enabled ? `miniapps-case miniapps-ref-mode ${refStyle.className}` : "miniapps-case"}
      style={refStyle.enabled ? (refStyle.cssVars as CSSProperties) : undefined}
    >
      <div className="miniapps-shell">
        <section className="miniapps-head miniapps-container">
          <Link className="miniapps-back" href="/">
            {content.backLabel}
          </Link>

          {content.heroVideoSrc ? (
            <div className="miniapps-hero">
              <video ref={heroVideoRef} autoPlay loop muted={heroMuted} playsInline preload="metadata" poster={content.heroPoster}>
                <source src={content.heroVideoSrc} type={videoMimeType(content.heroVideoSrc)} />
              </video>
              <button className="miniapps-sound-toggle" onClick={toggleHeroMuted} type="button" aria-label={heroMuted ? "Enable sound" : "Mute sound"}>
                {heroMuted ? "🔇" : "🔊"}
              </button>
            </div>
          ) : null}

          <h1>{content.title}</h1>

          {content.introTexts.map((text, index) => (
            <p className="miniapps-lead" key={`intro-${index}`}>
              {text}
            </p>
          ))}
        </section>

        {content.sections.map((section) => (
          <section className="miniapps-section miniapps-container" key={section.id}>
            <h2>{section.header ?? section.title ?? ""}</h2>
            {section.about ? <p className="miniapps-text">{section.about}</p> : null}
            {section.blocks.map((block) => (
              <div className={`miniapps-block miniapps-block-${block.type}`} key={block.id}>
                {renderBlock(block)}
              </div>
            ))}
          </section>
        ))}

        {content.thanksText ? (
          <section className="miniapps-section miniapps-container">
            <p className="miniapps-thanks">{content.thanksText}</p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
