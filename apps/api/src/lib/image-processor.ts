export type ProcessedImageVariant = {
  variant: "thumbnail" | "medium" | "large" | "square" | "original";
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: "image/webp";
  size: number;
};

const WEBP_OPTIONS = {
  quality: 82,
  effort: 4,
} as const;

type SharpLike = (input?: Buffer) => {
  rotate: () => any;
  resize: (options: {
    width: number;
    height: number;
    fit: "cover" | "inside";
    withoutEnlargement: boolean;
    position: "centre";
  }) => any;
  webp: (options: { quality: number; effort: number }) => any;
  toBuffer: (options: { resolveWithObject: true }) => Promise<{
    data: Buffer;
    info: { width: number; height: number; size: number };
  }>;
};

let sharpLoader: SharpLike | null = null;

async function getSharp(): Promise<SharpLike> {
  if (sharpLoader) return sharpLoader;
  try {
    const loaded = await import("sharp");
    sharpLoader = (loaded.default || loaded) as SharpLike;
    return sharpLoader;
  } catch {
    throw new Error(
      "Paket sharp belum terpasang. Jalankan: npm install --workspace=@bantuanku/api sharp"
    );
  }
}

const GENERAL_VARIANTS = [
  { variant: "thumbnail" as const, width: 300, height: 166, fit: "cover" as const },
  { variant: "medium" as const, width: 600, height: 332, fit: "cover" as const },
  { variant: "large" as const, width: 900, height: 498, fit: "cover" as const },
  { variant: "square" as const, width: 300, height: 300, fit: "cover" as const },
  { variant: "original" as const, width: 1200, height: 664, fit: "inside" as const },
];

async function runVariant(
  source: Buffer,
  variant: {
    variant: ProcessedImageVariant["variant"];
    width: number;
    height: number;
    fit: "cover" | "inside";
  }
): Promise<ProcessedImageVariant> {
  const sharp = await getSharp();
  const transformed = await sharp(source)
    .rotate()
    .resize({
      width: variant.width,
      height: variant.height,
      fit: variant.fit,
      withoutEnlargement: true,
      position: "centre",
    })
    .webp(WEBP_OPTIONS)
    .toBuffer({ resolveWithObject: true });

  return {
    variant: variant.variant,
    buffer: transformed.data,
    width: transformed.info.width,
    height: transformed.info.height,
    mimeType: "image/webp",
    size: transformed.info.size,
  };
}

export async function processGeneralImage(source: Buffer): Promise<ProcessedImageVariant[]> {
  const results: ProcessedImageVariant[] = [];
  for (const variant of GENERAL_VARIANTS) {
    results.push(await runVariant(source, variant));
  }
  return results;
}

export async function processSingleWebp(source: Buffer): Promise<ProcessedImageVariant> {
  return runVariant(source, {
    variant: "original",
    width: 1200,
    height: 664,
    fit: "inside",
  });
}
