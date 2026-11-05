import { type ExercisePhoto } from "@/features/sport/schemas";
import { z } from "zod";

const WGER_API = "https://wger.de/api/v2";
const CACHE_SECONDS = 60 * 60 * 24;
const MIN_MATCH_SCORE = 0.66;

const translationResponseSchema = z.object({
  results: z.array(
    z.object({
      exercise: z.number(),
      name: z.string(),
    }),
  ),
});

const imageResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      exercise: z.number(),
      image: z.string().url(),
      thumbnails: z
        .object({
          medium: z.string().url().optional(),
        })
        .nullable()
        .optional(),
      is_main: z.boolean().optional(),
      license: z.number(),
      license_author: z.string().optional(),
    }),
  ),
});

const licenseResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      short_name: z.string(),
      url: z.string().url(),
    }),
  ),
});

type Translation = z.infer<typeof translationResponseSchema>["results"][number];
type WgerImage = z.infer<typeof imageResponseSchema>["results"][number];
type Candidate = {
  names: string[];
  photo: ExercisePhoto;
};

const IGNORED_WORDS = new Set([
  "a",
  "al",
  "au",
  "aux",
  "avec",
  "de",
  "des",
  "du",
  "en",
  "la",
  "le",
  "les",
  "of",
  "the",
  "to",
  "un",
  "une",
  "with",
]);

const NAME_ALIASES: Array<[RegExp, string]> = [
  [/\bdeveloppe couche\b/g, "bench press"],
  [/\bsouleve de terre\b/g, "deadlift"],
  [/\bpompes?\b/g, "push up"],
  [/\btractions?\b/g, "pull up"],
  [/\bfentes?\b/g, "lunge"],
  [/\bplanche\b/g, "plank"],
  [/\bhaltere?s?\b/g, "dumbbell"],
  [/\bbarre\b/g, "barbell"],
  [/\bpoulie\b/g, "cable"],
  [/\btirage vertical\b/g, "lat pulldown"],
  [/\btirage horizontal\b/g, "cable row"],
];

function normalizedTokens(value: string): string[] {
  let normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-’']/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const [pattern, replacement] of NAME_ALIASES) {
    normalized = normalized.replace(pattern, replacement);
  }

  return [
    ...new Set(
      normalized
        .split(" ")
        .filter((token) => token.length > 1 && !IGNORED_WORDS.has(token))
        .map((token) => (token.endsWith("s") && token.length > 4 ? token.slice(0, -1) : token)),
    ),
  ].sort();
}

function matchScore(query: string, candidate: string): number {
  const queryTokens = normalizedTokens(query);
  const candidateTokens = normalizedTokens(candidate);
  if (queryTokens.length === 0 || candidateTokens.length === 0) return 0;

  const querySet = new Set(queryTokens);
  const overlap = candidateTokens.filter((token) => querySet.has(token)).length;
  return overlap / Math.max(queryTokens.length, candidateTokens.length);
}

export function bestExercisePhotoMatch(
  name: string,
  candidates: Candidate[],
): ExercisePhoto | null {
  const scores = candidates
    .map((candidate) => ({
      candidate,
      score: Math.max(...candidate.names.map((candidateName) => matchScore(name, candidateName))),
    }))
    .filter(({ score }) => score >= MIN_MATCH_SCORE)
    .sort((left, right) => right.score - left.score);

  const best = scores[0];
  if (!best) return null;

  const ambiguous = scores.some(
    ({ candidate, score }) => candidate !== best.candidate && best.score - score < 0.03,
  );
  return ambiguous ? null : best.candidate.photo;
}

async function fetchWgerResults<T>(
  resource: string,
  schema: z.ZodType<{ results: T[] }>,
  params: Record<string, string> = {},
): Promise<T[]> {
  const url = new URL(`${WGER_API}/${resource}/`);
  url.searchParams.set("limit", "1000");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: CACHE_SECONDS },
  });
  if (!response.ok) throw new Error(`wger ${resource} request failed (${response.status})`);

  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new Error(`wger ${resource} response was invalid`);
  return parsed.data.results;
}

function safeHttpsUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" && url.hostname === "creativecommons.org") {
      url.protocol = "https:";
    }
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeWgerImageUrl(value: string | undefined): string | null {
  const url = safeHttpsUrl(value);
  return url && new URL(url).hostname === "wger.de" ? url : null;
}

function makeCandidates(
  translations: Translation[],
  images: WgerImage[],
  licenseNames: Map<number, { name: string; url: string }>,
): Candidate[] {
  const imagesByExercise = new Map<number, WgerImage>();
  for (const image of images) {
    if (!licenseNames.has(image.license)) continue;
    const current = imagesByExercise.get(image.exercise);
    if (!current || (image.is_main && !current.is_main)) {
      imagesByExercise.set(image.exercise, image);
    }
  }

  const candidatesByExercise = new Map<number, Candidate>();
  for (const translation of translations) {
    const image = imagesByExercise.get(translation.exercise);
    if (!image) continue;

    const license = licenseNames.get(image.license);
    const imageUrl = safeWgerImageUrl(image.thumbnails?.medium) ?? safeWgerImageUrl(image.image);
    const sourceUrl = safeWgerImageUrl(image.image);
    const licenseUrl = safeHttpsUrl(license?.url);
    if (!license || !imageUrl || !sourceUrl || !licenseUrl) continue;

    const candidate = candidatesByExercise.get(translation.exercise);
    if (candidate) {
      candidate.names.push(translation.name);
    } else {
      candidatesByExercise.set(translation.exercise, {
        names: [translation.name],
        photo: {
          imageUrl,
          sourceUrl,
          author: image.license_author?.trim() || "wger",
          licenseName: license.name,
          licenseUrl,
        },
      });
    }
  }
  return [...candidatesByExercise.values()];
}

export async function findExercisePhotos(names: string[]) {
  const [english, french, images, licenses] = await Promise.all([
    fetchWgerResults("exercise-translation", translationResponseSchema, { language: "2" }),
    fetchWgerResults("exercise-translation", translationResponseSchema, { language: "12" }),
    fetchWgerResults("exerciseimage", imageResponseSchema),
    fetchWgerResults("license", licenseResponseSchema),
  ]);
  const licenseNames = new Map(
    licenses.map((license) => [license.id, { name: license.short_name.trim(), url: license.url }]),
  );
  const candidates = makeCandidates([...english, ...french], images, licenseNames);

  return names.map((name) => ({
    name,
    photo: bestExercisePhotoMatch(name, candidates),
  }));
}
