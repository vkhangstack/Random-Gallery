export function selectRandomImage(
  ids: readonly string[],
  current: string | null,
  random: () => number = Math.random,
): string | null {
  if (!ids.length) return null;
  const candidates = ids.length > 1 ? ids.filter((id) => id !== current) : ids;
  return candidates[Math.floor(random() * candidates.length)];
}
