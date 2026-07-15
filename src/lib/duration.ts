/**
 * Parse human duration input into seconds.
 * Accepts: "2h", "30m", "1h 30m", "1.5h", "1,5h", plain "2" (hours).
 * Returns null on anything it can't fully understand.
 */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/,/g, '.');
  if (!s) return null;

  if (/^\d+(\.\d+)?$/.test(s)) {
    return Math.round(parseFloat(s) * 3600);
  }

  let total = 0;
  const rest = s.replace(/(\d+(?:\.\d+)?)\s*([hm])/g, (_, num: string, unit: string) => {
    total += parseFloat(num) * (unit === 'h' ? 3600 : 60);
    return '';
  });
  if (rest.trim() !== '' || total === 0) return null;
  return Math.round(total);
}
