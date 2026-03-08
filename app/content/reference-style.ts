export type ReferenceStyleProfile = "kawaii" | "cyberpunk" | "glossy" | "comic" | "doom" | "techno";
export type ReferenceLayout = "stack" | "magazine" | "zigzag" | "flyer" | "mosaic";
export type ReferencePattern = "grid" | "dots" | "stripes" | "noise" | "plasma";
export type ReferenceFx = "calm" | "blink" | "glitch" | "float" | "shake";

export type ReferenceStyleAnalysis = {
  enabled: boolean;
  profile: ReferenceStyleProfile;
  className: string;
  cssVars: Record<string, string>;
  styleName: string;
};

export type ReferenceStyleMode = "default" | "site" | "random";

const WORD_BANK_A = [
  "kawaii",
  "neon",
  "gloss",
  "comic",
  "doom",
  "techno",
  "toxic",
  "chrome",
  "bubble",
  "acid",
  "pixel",
  "velvet",
  "metal",
  "rave",
  "future",
];

const WORD_BANK_B = [
  "dream",
  "poster",
  "matrix",
  "kiss",
  "thunder",
  "cathedral",
  "party",
  "candy",
  "chaos",
  "signal",
  "ritual",
  "cluster",
  "spray",
  "flare",
  "echo",
];

const WORD_BANK_C = [
  "protocol",
  "theory",
  "edition",
  "syntax",
  "manual",
  "volume",
  "system",
  "language",
  "engine",
  "cult",
  "archive",
  "machine",
  "agenda",
  "delta",
  "module",
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickWord(list: string[], seed: number, salt: number): string {
  return list[(seed + salt * 17) % list.length];
}

function choose<T>(seed: number, values: T[], salt: number): T {
  return values[(seed + salt * 131) % values.length];
}

function pickProfile(key: string, seed: number): ReferenceStyleProfile {
  if (/kawaii|cute|anime|pastel|candy/.test(key)) return "kawaii";
  if (/cyber|matrix|hack|neon|glitch|punk/.test(key)) return "cyberpunk";
  if (/gloss|lux|fashion|beauty|shine|chrome/.test(key)) return "glossy";
  if (/comic|manga|toon|cartoon|speech|pop/.test(key)) return "comic";
  if (/doom|metal|goth|dark|black|horror/.test(key)) return "doom";
  if (/techno|rave|flyer|club|electro|house/.test(key)) return "techno";

  return choose(seed, ["kawaii", "cyberpunk", "glossy", "comic", "doom", "techno"], 1);
}

export function generateRandomStyleName(): string {
  const seed = Math.floor(Math.random() * 10_000_000);
  return `${pickWord(WORD_BANK_A, seed, 1)} ${pickWord(WORD_BANK_B, seed, 2)} ${pickWord(WORD_BANK_C, seed, 3)}`;
}

function parseUrlParts(siteUrl?: string): { host: string; pathname: string; key: string } {
  const raw = (siteUrl ?? "").trim();
  if (!raw) {
    return { host: "", pathname: "", key: "" };
  }

  let normalized = raw;
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  try {
    const parsed = new URL(normalized);
    const fullHref = `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`.toLowerCase();
    return {
      host: parsed.hostname.toLowerCase(),
      pathname: parsed.pathname.toLowerCase(),
      key: fullHref,
    };
  } catch {
    return {
      host: raw.toLowerCase(),
      pathname: "",
      key: raw.toLowerCase(),
    };
  }
}

export function analyzeReferenceStyle(
  siteUrl?: string,
  styleName?: string,
  mode: ReferenceStyleMode = "default"
): ReferenceStyleAnalysis {
  const styleNameValue = (styleName ?? "").trim();
  const { host, pathname, key: siteKey } = parseUrlParts(siteUrl);
  const keySource = mode === "site" ? siteKey : mode === "random" ? styleNameValue : "";

  if (mode === "default" || !keySource) {
    return {
      enabled: false,
      profile: "kawaii",
      className: "",
      cssVars: {},
      styleName: styleNameValue,
    };
  }

  if (mode === "site") {
    const seed = hashString(keySource.toLowerCase());
    const signature = seed % 29;
    const lowerKey = keySource.toLowerCase();
    const darkLike = /petrick|major-grom|grom|game|dark|black|noir|horror|demon|neon/.test(lowerKey);
    const editorialLike = /editorial|journal|story|mag|buck|work|case|project/.test(lowerKey);
    const copySide = darkLike
      ? "center"
      : /editorial|journal|story|mag|buck|work/.test(lowerKey)
        ? "right"
        : choose(seed, ["left", "right"], 5);
    const fontPreset = darkLike ? "sans" : /fashion|luxe|art|museum/.test(lowerKey) ? "serif" : "sans";
    const theme = darkLike ? "dark" : "light";
    const siteVariant = choose(seed, ["v1", "v2", "v3"], 6);
    const bgLightness = darkLike ? 4 + (seed % 4) : 95 + (seed % 5);
    const hue = 188 + (seed % 48);
    const shellWidth = darkLike ? 1520 + (seed % 180) : 1300 + (seed % 380);
    const containerWidth = darkLike ? 1460 + (seed % 180) : 980 + (seed % 380);
    const gridGap = darkLike ? 2 + (seed % 7) : 20 + (seed % 28) + (signature % 6);
    const sectionSpace = darkLike ? 64 + (seed % 30) : 40 + (seed % 44) + (signature % 8);
    const copyWidth = 520 + (seed % 260);
    const copyColSpan = darkLike ? 5 : 3 + (seed % 4);
    const copyColStart = darkLike ? 4 + (seed % 2) : 1;
    const titleScale = (editorialLike ? 1.38 + (seed % 5) * 0.08 : 1.16 + (seed % 6) * 0.07).toFixed(2);
    const sectionScale = (editorialLike ? 1.2 + ((seed >> 2) % 5) * 0.07 : 1.0 + ((seed >> 2) % 5) * 0.06).toFixed(2);
    const leadSize = (editorialLike ? 1.28 + ((seed >> 3) % 3) * 0.06 : 1.14 + ((seed >> 3) % 3) * 0.05).toFixed(2);
    const textSize = (editorialLike ? 1.16 + ((seed >> 4) % 3) * 0.06 : 1.06 + ((seed >> 4) % 3) * 0.05).toFixed(2);
    const headingWeight = darkLike ? "700" : editorialLike ? "400" : "500";
    const subheadingWeight = darkLike ? "600" : editorialLike ? "400" : "500";
    const copyToMediaGap = darkLike ? 42 + (seed % 28) + (signature % 8) : 30 + (seed % 32) + (signature % 8);
    const rowStackGap = darkLike ? 6 + (seed % 8) + (signature % 3) : 10 + (seed % 18) + (signature % 4);

    return {
      enabled: true,
      profile: "glossy",
      className: [
        "miniapps-ref-site",
        `miniapps-ref-site-theme-${theme}`,
        `miniapps-ref-site-copy-${copySide}`,
        `miniapps-ref-site-font-${fontPreset}`,
        `miniapps-ref-site-${siteVariant}`,
      ].join(" "),
      styleName: styleNameValue,
      cssVars: {
        "--site-bg": `hsl(${hue} 10% ${bgLightness}%)`,
        "--site-ink": darkLike ? "hsl(0 0% 94%)" : `hsl(${hue} 14% 12%)`,
        "--site-muted": darkLike ? "hsl(0 0% 78%)" : `hsl(${hue} 10% 24%)`,
        "--site-shell-width": `${shellWidth}px`,
        "--site-container-width": `${containerWidth}px`,
        "--site-grid-gap": `${gridGap}px`,
        "--site-section-space": `${sectionSpace}px`,
        "--site-copy-width": `${copyWidth}px`,
        "--site-copy-col-span": `${copyColSpan}`,
        "--site-copy-col-start": `${copyColStart}`,
        "--site-title-scale": titleScale,
        "--site-section-scale": sectionScale,
        "--site-lead-size": `${leadSize}rem`,
        "--site-text-size": `${textSize}rem`,
        "--site-heading-weight": headingWeight,
        "--site-subheading-weight": subheadingWeight,
        "--site-copy-to-media-gap": `${copyToMediaGap}px`,
        "--site-row-stack-gap": `${rowStackGap}px`,
        "--site-signature": `${signature}`,
      },
    };
  }

  const seed = hashString(keySource);
  const profile = pickProfile(keySource.toLowerCase(), seed);
  const layout = choose<ReferenceLayout>(seed, ["stack", "magazine", "zigzag", "flyer", "mosaic"], 2);
  const pattern = choose<ReferencePattern>(seed, ["grid", "dots", "stripes", "noise", "plasma"], 3);
  const fx = choose<ReferenceFx>(seed, ["calm", "blink", "glitch", "float", "shake"], 4);

  const hue = seed % 360;
  const hue2 = (hue + 38 + (seed % 34)) % 360;
  const hue3 = (hue + 180 + ((seed >> 3) % 30)) % 360;

  const satBase = 62 + (seed % 32);
  const lightBg = 90 + (seed % 8);
  const lightBg2 = 80 + ((seed >> 2) % 12);
  const stripe = 8 + (seed % 34);
  const dot = 6 + ((seed >> 3) % 24);
  const tilt = ((seed % 23) - 11) * 1.35;
  const radius = 2 + ((seed >> 4) % 34);
  const titleScale = (0.82 + ((seed % 17) / 10)).toFixed(2);
  const sectionScale = (0.78 + (((seed >> 2) % 16) / 10)).toFixed(2);
  const className = [
    `miniapps-ref-${profile}`,
    `miniapps-ref-layout-${layout}`,
    `miniapps-ref-pattern-${pattern}`,
    `miniapps-ref-fx-${fx}`,
  ].join(" ");

  return {
    enabled: true,
    profile,
    className,
    styleName: styleNameValue,
    cssVars: {
      "--ref-hue": `${hue}`,
      "--ref-hue-2": `${hue2}`,
      "--ref-hue-3": `${hue3}`,
      "--ref-accent": `hsl(${hue} ${satBase}% 54%)`,
      "--ref-accent-soft": `hsl(${hue2} ${Math.max(44, satBase - 16)}% 82%)`,
      "--ref-bg": `hsl(${hue} ${Math.max(22, satBase - 36)}% ${lightBg}%)`,
      "--ref-bg-2": `hsl(${hue2} ${Math.max(24, satBase - 30)}% ${lightBg2}%)`,
      "--ref-ink": `hsl(${hue3} 28% 12%)`,
      "--ref-muted": `hsl(${hue3} 14% 34%)`,
      "--ref-border": `hsl(${hue2} 24% 72%)`,
      "--ref-shadow": `hsla(${hue3} 40% 12% / 0.18)`,
      "--ref-stripe": `${stripe}px`,
      "--ref-dot": `${dot}px`,
      "--ref-tilt": `${tilt}deg`,
      "--ref-radius": `${radius}px`,
      "--ref-title-scale": titleScale,
      "--ref-section-scale": sectionScale,
    },
  };
}
