import useSWR from "swr";
import { fonts } from "../tailwind/tailwind";

/**
 * Font-picker list in picker order: curated popular, then funky, then every
 * other Google family alphabetically. Each entry is `[family]` (the shape the
 * bundled `fonts` fallback uses). Shared by every font picker via one SWR key.
 *
 * `fonts` is the bundled fallback until the list lands, or if it fails.
 */
async function loadFontList(): Promise<string[][]> {
  const { fetchGoogleFonts, getPopularFonts, getFunkyFonts } = await import("./googleFonts");
  const googleFonts = await fetchGoogleFonts();
  const popular = getPopularFonts();
  const funky = getFunkyFonts();
  const others = googleFonts
    .filter(f => !popular.includes(f.family) && !funky.includes(f.family))
    .map(f => [f.family])
    .sort((a, b) => a[0].localeCompare(b[0]));
  return [
    ...popular.map(f => [f]),
    ...funky.filter(f => !popular.includes(f)).map(f => [f]),
    ...others,
  ];
}

export function useGoogleFontList(): { fonts: string[][]; isLoading: boolean } {
  const { data, isLoading } = useSWR<string[][]>("pagehub:fonts:google-list", loadFontList, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  return { fonts: data ?? fonts, isLoading };
}
