export type MediaType = "image" | "gif" | "video";

export type MediaItem = {
  id: string;
  src: string;
  alt: string;
  ar?: number;
  type?: MediaType;
  soundEnabled?: boolean;
};

export type RowLayout = "row-1" | "row-2" | "row-3" | "grid-3";

export type ContentRow = {
  id: string;
  layout: RowLayout;
  gridCols?: 2 | 3 | 4 | 5 | 6;
  equalHeight?: boolean;
  items: MediaItem[];
};

export type SectionBlock =
  | {
      id: string;
      type: "text";
      text: string;
    }
  | {
      id: string;
      type: "subheading";
      text: string;
    }
  | {
      id: string;
      type: "row";
      row: ContentRow;
    };

export type ProjectSection = {
  id: string;
  header?: string;
  about?: string;
  title?: string;
  blocks: SectionBlock[];
};

export type ProjectPageContent = {
  backLabel: string;
  title: string;
  materialsFolder?: string;
  tags?: ProjectTag[];
  referenceStyle?: {
    mode?: "default" | "site" | "random";
    siteUrl?: string;
    styleName?: string;
    useThisStyle?: boolean;
    useSiteStyle?: boolean;
  };
  heroVideoSrc?: string;
  heroPoster?: string;
  introTexts: string[];
  sections: ProjectSection[];
  thanksText?: string;
};

export type ProjectTag = "2d" | "3d" | "ai" | "mix";

export type HomeProjectCard = {
  id: string;
  title: string;
  shape: "landscape" | "portrait" | "tall" | "square";
  tone: "neo" | "anime" | "aqua" | "sky" | "flat" | "night" | "mint" | "lime" | "ice" | "peach";
  href?: string;
  thumbnailSrc?: string;
  layout?: {
    top: number;
    left: number;
    width: number;
  };
};

export type HomeProjectsRow = {
  id: string;
  projectIds: string[];
};

export type HomeSticker = {
  id: string;
  src: string;
  alt?: string;
};

export type HomePageContent = {
  heroTitle: string;
  mottoText?: string;
  footerText: string;
  referenceSiteUrl?: string;
  projects: HomeProjectCard[];
  rows?: HomeProjectsRow[];
  stickers?: HomeSticker[];
};

export type SiteContent = {
  version: number;
  home: HomePageContent;
  projects: Record<string, ProjectPageContent>;
  specialPages: {
    artdirCourse: ProjectPageContent;
    studio: ProjectPageContent;
    contacts: ProjectPageContent;
  };
};
