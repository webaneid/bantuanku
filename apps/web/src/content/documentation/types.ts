export type DocumentationSection = {
  id: string;
  heading: string;
  bodyHtml: string;
};

export type DocumentationPage = {
  slug: string;
  title: string;
  category: string;
  summary?: string;
  updatedAt: string;
  sections: DocumentationSection[];
};

export type DocumentationCategory = {
  id: string;
  label: string;
  items: Array<{
    slug: string;
    title: string;
  }>;
};

export type DocumentationManifest = {
  version: number;
  categories: DocumentationCategory[];
};
