const SIZES = { sm: "w-6 h-6 text-[10px]", md: "w-8 h-8 text-xs", lg: "w-16 h-16 text-xl" } as const;

/** Profile picture, or the name's initial. Decorative: the name is always shown next to it. */
export function Avatar({ name, url, size = "md" }: { name: string; url: string | null; size?: keyof typeof SIZES }) {
  const box = `${SIZES[size]} shrink-0 rounded-full`;
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- user uploads on the storage host
    <img src={url} alt="" className={`${box} object-cover`} />
  ) : (
    <span aria-hidden className={`${box} bg-slate-700 text-slate-200 font-semibold flex items-center justify-center`}>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
