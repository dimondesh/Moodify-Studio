// src/hooks/useMediaQuery.ts

import { useState, useEffect } from "react";

/**
 * @param query Строка медиа-запроса
 * @returns boolean - соответствует ли текущий размер окна запросу.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);

    return () => window.removeEventListener("resize", listener);
  }, [matches, query]);

  return matches;
}
