import Image from "next/image";

const photos = {
  home: "photo-1490645935967-10de6ba17061",
  meals: "photo-1490645935967-10de6ba17061",
  recipes: "photo-1547592180-85f173990554",
  shopping: "photo-1542838132-92c53300491e",
  inventory: "photo-1556909114-f6e7ad7d3136",
  tracking: "photo-1543353071-873f17a7a088",
  sport: "photo-1517836357463-d25dfeac3438",
  community: "photo-1529156069898-49953e39b3ac",
} as const;

type PhotoHeroProps = {
  image: keyof typeof photos;
  title: string;
  subtitle: string;
  kicker?: string;
  meta?: string;
};

export function PhotoHero({ image, title, subtitle, kicker = "MealMate", meta }: PhotoHeroProps) {
  const src = `https://images.unsplash.com/${photos[image]}?auto=format&fit=crop&w=1800&q=85`;

  return (
    <section className="relative isolate flex min-h-44 items-end overflow-hidden rounded-[1.5rem] bg-primary px-5 py-5 text-white shadow-sm sm:min-h-52 sm:px-7 sm:py-6">
      <Image
        src={src}
        alt=""
        fill
        priority
        sizes="(max-width: 768px) 100vw, 1200px"
        className="absolute inset-0 -z-20 object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-black/40 to-black/5"
      />
      <div className="max-w-2xl">
        <p className="text-xs font-bold tracking-[0.18em] text-white/80 uppercase">{kicker}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
          {subtitle}
        </p>
        {meta && <p className="mt-2 text-xs font-semibold text-white/75">{meta}</p>}
      </div>
    </section>
  );
}
