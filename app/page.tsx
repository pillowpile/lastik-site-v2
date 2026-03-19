"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSiteContent } from "@/app/content/use-site-content";

type CursorState = {
  x: number;
  y: number;
  visible: boolean;
  overCard: boolean;
};

type HoverState = {
  cardId: string;
  rowIndex: number;
  cardIndex: number;
};

function mediaTypeFromSrc(src: string): "video" | "image" {
  const lower = src.toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov")) {
    return "video";
  }
  return "image";
}

function isAlphaLikeThumb(src?: string): boolean {
  if (!src) {
    return false;
  }
  const lower = src.toLowerCase();
  if (lower.includes("alpha")) {
    return true;
  }
  if (lower.includes("/rocs/") && lower.endsWith(".webm")) {
    return true;
  }
  return lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".avif") || lower.endsWith(".gif");
}

function projectSlugFromHref(href?: string): string | null {
  if (!href) {
    return null;
  }
  const match = href.match(/^\/projects\/([^/?#]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function defaultRows(cardIds: string[]): Array<{ id: string; projectIds: string[] }> {
  const rows: Array<{ id: string; projectIds: string[] }> = [];
  let i = 0;
  let rowIndex = 1;
  while (i < cardIds.length) {
    const size = rowIndex % 3 === 1 ? 2 : rowIndex % 3 === 2 ? 3 : 1;
    rows.push({
      id: `fallback-${rowIndex}`,
      projectIds: cardIds.slice(i, i + size),
    });
    i += size;
    rowIndex += 1;
  }
  return rows;
}

export default function Home() {
  const { home } = useSiteContent();
  const [cursor, setCursor] = useState<CursorState>({ x: 0, y: 0, visible: false, overCard: false });
  const [hovered, setHovered] = useState<HoverState | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const cardVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const cardsById = useMemo(() => new Map(home.projects.map((card) => [card.id, card])), [home.projects]);

  const rows = useMemo(() => {
    const baseRows = (home.rows ?? []).length > 0 ? home.rows ?? [] : defaultRows(home.projects.map((card) => card.id));
    const mapped = baseRows
      .map((row) => {
        const cards = row.projectIds
          .map((id) => cardsById.get(id))
          .filter((card): card is NonNullable<typeof card> => Boolean(card));
        return { id: row.id, cards };
      })
      .filter((row) => row.cards.length > 0);
    const used = new Set(mapped.flatMap((row) => row.cards.map((card) => card.id)));
    const rest = home.projects.filter((card) => !used.has(card.id));
    if (rest.length > 0) {
      for (const row of defaultRows(rest.map((card) => card.id))) {
        const cards = row.projectIds
          .map((id) => cardsById.get(id))
          .filter((card): card is NonNullable<typeof card> => Boolean(card));
        mapped.push({
          id: row.id,
          cards,
        });
      }
    }
    return mapped;
  }, [cardsById, home.projects, home.rows]);

  const displayRows = useMemo(() => {
    if (!isMobile) {
      return rows;
    }
    const cards = rows.flatMap((row) => row.cards);
    const mobileRows: typeof rows = [];
    for (let i = 0; i < cards.length; i += 2) {
      mobileRows.push({
        id: `mobile-${Math.floor(i / 2) + 1}`,
        cards: cards.slice(i, i + 2),
      });
    }
    return mobileRows;
  }, [isMobile, rows]);

  const stickers = useMemo(() => {
    const base = (home.stickers ?? []).filter((sticker) => Boolean(sticker.src));
    if (base.length > 0) {
      return base;
    }
    return home.projects
      .filter((card) => card.thumbnailSrc)
      .slice(0, 10)
      .map((card, index) => ({ id: `auto-${index + 1}`, src: card.thumbnailSrc!, alt: card.title }));
  }, [home.projects, home.stickers]);
  const loopedStickers = useMemo(() => [...stickers, ...stickers, ...stickers], [stickers]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      setCursor((prev) => ({ ...prev, x: event.clientX, y: event.clientY, visible: true }));
    };
    const onLeave = () => setCursor((prev) => ({ ...prev, visible: false, overCard: false }));
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1024px)");
    const onChange = () => {
      setIsMobile(media.matches);
    };
    onChange();
    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setExpandedCardId(null);
      return;
    }
    if (!expandedCardId) {
      for (const video of Object.values(cardVideoRefs.current)) {
        if (!video) {
          continue;
        }
        video.pause();
        video.currentTime = 0;
      }
      return;
    }
    playHoveredVideo(expandedCardId);
  }, [expandedCardId, isMobile]);

  function setCardVideoRef(cardId: string, element: HTMLVideoElement | null) {
    cardVideoRefs.current[cardId] = element;
  }

  function computeRowWeights(cardCount: number, activeIndex: number | null, rowIndex: number): number[] {
    const base = Array.from({ length: cardCount }, () => 1);
    if (cardCount <= 1) {
      return base;
    }
    if (activeIndex === null) {
      if (cardCount === 2) {
        return rowIndex % 2 === 0 ? [1.16, 0.84] : [0.84, 1.16];
      }
      return base;
    }
    for (let i = 0; i < cardCount; i += 1) {
      const distance = Math.abs(i - activeIndex);
      if (distance === 0) {
        base[i] = 1.9;
      } else if (distance === 1) {
        base[i] = 0.72;
      } else {
        base[i] = 0.88;
      }
    }
    const total = base.reduce((sum, value) => sum + value, 0);
    return base.map((value) => (value * cardCount) / total);
  }

  function rowShift(rowIndex: number): { x: number; y: number } {
    if (!hovered) {
      return { x: 0, y: 0 };
    }
    const delta = rowIndex - hovered.rowIndex;
    const influence = Math.max(0, 1 - Math.abs(delta) / 5);
    const hoveredRowCount = rows[hovered.rowIndex]?.cards.length ?? 3;
    const mainDirection =
      hovered.cardIndex === 0
        ? -1
        : hovered.cardIndex === hoveredRowCount - 1
          ? 1
          : hovered.cardIndex < hoveredRowCount / 2
            ? -1
            : 1;

    if (delta === 0) {
      return { x: mainDirection * 16, y: 0 };
    }

    const xDir = -mainDirection;
    return {
      x: xDir * influence * 14,
      y: delta * influence * 2.5,
    };
  }

  function playHoveredVideo(cardId: string) {
    for (const [id, video] of Object.entries(cardVideoRefs.current)) {
      if (!video) {
        continue;
      }
      if (id === cardId) {
        video.currentTime = 0;
        void video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    }
  }

  function stopHoveredVideo(cardId: string) {
    const video = cardVideoRefs.current[cardId];
    if (!video) {
      return;
    }
    video.pause();
    video.currentTime = 0;
  }

  return (
    <main className="home-redesign">
      <div
        className={`home-cursor ${cursor.visible ? "is-visible" : ""} ${cursor.overCard ? "is-over-card" : ""}`}
        style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
        aria-hidden="true"
      />

      <header className="home-head">
        <nav className="home-pill-nav" aria-label="Разделы">
          <Link href="/">проекты</Link>
          <Link href="/studio">студия</Link>
          <Link href="/contacts">что-то</Link>
          <Link href="/artdir-kurs">арт-дирекшен курс</Link>
        </nav>
        <h1>{home.heroTitle}</h1>
        <p>{home.mottoText ?? "Design that's crazy good"}</p>
      </header>

      <section className="home-content-grid" aria-label="Проекты и стикеры">
        <div className="home-rows">
          {displayRows.map((row, rowIndex) => {
            const cardCount = Math.max(1, Math.min(isMobile ? 2 : 3, row.cards.length));
            const mobileActiveIndex = isMobile ? row.cards.findIndex((card) => card.id === expandedCardId) : -1;
            const activeIndex = isMobile ? (mobileActiveIndex >= 0 ? mobileActiveIndex : null) : hovered?.rowIndex === rowIndex ? hovered.cardIndex : null;
            const weights = computeRowWeights(cardCount, activeIndex, rowIndex);
            const shift = isMobile ? { x: 0, y: 0 } : rowShift(rowIndex);
            const rowStyle = {
              gridTemplateColumns: weights.map((weight) => `${weight.toFixed(4)}fr`).join(" "),
              "--row-shift-x": `${shift.x.toFixed(2)}px`,
              "--row-shift-y": `${shift.y.toFixed(2)}px`,
            } as CSSProperties;
            return (
              <div
                key={row.id}
                className={`home-project-row ${cardCount === 1 ? "home-project-row-single" : ""}`}
                style={rowStyle}
              >
                {row.cards.map((card, cardIndex) => {
                const src = card.thumbnailSrc;
                const type = src ? mediaTypeFromSrc(src) : "image";
                const isAlphaThumb = isAlphaLikeThumb(src);
                const slug = projectSlugFromHref(card.href);
                const shouldContain = slug === "eapteka" || slug === "delimobil";
                const noFrame = slug === "eapteka" || slug === "delimobil";
                const sizeClass = slug === "sber-terminal" ? "home-card-limit-sber" : slug === "rocs" ? "home-card-limit-rocs" : "";
                return (
                  <article
                    key={card.id}
                    className={`home-card home-shape-${card.shape} ${isAlphaThumb ? "home-card-alpha" : ""} ${shouldContain ? "home-card-contain" : ""} ${
                      noFrame ? "home-card-no-frame" : ""
                    } ${slug === "mansi" ? "home-card-mansi" : ""} ${sizeClass} ${hovered?.cardId === card.id ? "is-hovered" : ""} ${
                      expandedCardId === card.id ? "is-expanded" : ""
                    }`}
                    onMouseEnter={() => {
                      if (isMobile) {
                        return;
                      }
                      setCursor((prev) => ({ ...prev, overCard: true }));
                      setHovered({ cardId: card.id, rowIndex, cardIndex });
                      playHoveredVideo(card.id);
                    }}
                    onMouseLeave={() => {
                      if (isMobile) {
                        return;
                      }
                      setCursor((prev) => ({ ...prev, overCard: false }));
                      setHovered((prev) => (prev?.cardId === card.id ? null : prev));
                      stopHoveredVideo(card.id);
                    }}
                  >
                    {card.href ? (
                      <Link
                        href={card.href}
                        className="home-card-link"
                        aria-label={`Открыть проект ${card.title}`}
                        onClick={(event) => {
                          if (!isMobile) {
                            return;
                          }
                          if (expandedCardId !== card.id) {
                            event.preventDefault();
                            setExpandedCardId(card.id);
                            return;
                          }
                        }}
                      >
                        <div className="home-card-frame">
                          {src ? (
                            type === "video" ? (
                              <video autoPlay loop muted playsInline preload="auto" className="home-card-media" ref={(el) => setCardVideoRef(card.id, el)}>
                                <source src={src} />
                              </video>
                            ) : (
                              <img src={src} alt={card.title} className="home-card-media" />
                            )
                          ) : (
                            <div className="home-card-placeholder">{card.title}</div>
                          )}
                        </div>
                        <span className="home-card-title">{card.title}</span>
                      </Link>
                    ) : (
                      <div
                        className="home-card-link"
                        onClick={() => {
                          if (!isMobile) {
                            return;
                          }
                          setExpandedCardId((prev) => (prev === card.id ? null : card.id));
                        }}
                      >
                        <div className="home-card-frame">
                          {src ? (
                            type === "video" ? (
                              <video autoPlay loop muted playsInline preload="auto" className="home-card-media" ref={(el) => setCardVideoRef(card.id, el)}>
                                <source src={src} />
                              </video>
                            ) : (
                              <img src={src} alt={card.title} className="home-card-media" />
                            )
                          ) : (
                            <div className="home-card-placeholder">{card.title}</div>
                          )}
                        </div>
                        <span className="home-card-title">{card.title}</span>
                      </div>
                    )}
                  </article>
                );
                })}
              </div>
            );
          })}
        </div>

        <aside className="home-sticker-rail" aria-label="Стикеры">
          <div className="home-sticker-track">
            {loopedStickers.map((sticker, index) => {
              const type = mediaTypeFromSrc(sticker.src);
              return (
                <div className="home-sticker" key={`${sticker.id}-${index}`}>
                  {type === "video" ? (
                    <video autoPlay loop muted playsInline preload="metadata">
                      <source src={sticker.src} />
                    </video>
                  ) : (
                    <img src={sticker.src} alt={sticker.alt ?? `Sticker ${index + 1}`} />
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </section>

      <footer className="home-redesign-footer">{home.footerText}</footer>
    </main>
  );
}
