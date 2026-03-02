import { useState, useEffect, useCallback, useRef } from "react";

interface Verse {
  arabic: string;
  english: string;
  surahName: string;
  verseKey: string;
}

const chapterCache = new Map<number, string>();

const FALLBACK_VERSES: Verse[] = [
  { arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", english: "Indeed, with hardship comes ease.", surahName: "Ash-Sharh", verseKey: "94:6" },
  { arabic: "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا", english: "And whoever fears Allah — He will make for him a way out.", surahName: "At-Talaq", verseKey: "65:2" },
  { arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", english: "Sufficient for us is Allah, and He is the best Disposer of affairs.", surahName: "Ali 'Imran", verseKey: "3:173" },
  { arabic: "وَبَشِّرِ الصَّابِرِينَ", english: "And give good tidings to the patient.", surahName: "Al-Baqarah", verseKey: "2:155" },
  { arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", english: "For indeed, with hardship will be ease.", surahName: "Ash-Sharh", verseKey: "94:5" },
];

function randomFallback(): Verse {
  return FALLBACK_VERSES[Math.floor(Math.random() * FALLBACK_VERSES.length)];
}

/** Strip HTML tags and footnote markers like <sup>1</sup> from translation text */
function cleanTranslation(raw: string): string {
  return raw
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "") // remove footnote superscripts
    .replace(/<[^>]*>/g, "")               // strip remaining HTML tags
    .replace(/\s+/g, " ")
    .trim();
}

export function useQuranVerse() {
  const [verse, setVerse] = useState<Verse>(randomFallback());
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchRandomVerse = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch with two translation IDs: 131 (Dr. Mustafa Khattab) + 85 (Sahih International)
      // so we always have a fallback translation
      const res = await fetch(
        "https://api.quran.com/api/v4/verses/random?language=en&translations=131,85&fields=text_uthmani"
      );
      if (!res.ok) throw new Error("Quran API error");
      const data = await res.json();
      const v = data.verse;
      const arabic: string = v.text_uthmani ?? "";

      // Try each returned translation until we get a non-empty one
      let english = "";
      for (const t of (v.translations ?? [])) {
        const cleaned = cleanTranslation(t.text ?? "");
        if (cleaned.length > 5) { english = cleaned; break; }
      }

      const verseKey: string = v.verse_key ?? "";
      const chapterId: number = v.chapter_id;

      let surahName = chapterCache.get(chapterId) ?? "";
      if (!surahName) {
        try {
          const chRes = await fetch(`https://api.quran.com/api/v4/chapters/${chapterId}?language=en`);
          if (chRes.ok) {
            const chData = await chRes.json();
            surahName = chData.chapter?.name_simple ?? `Chapter ${chapterId}`;
            chapterCache.set(chapterId, surahName);
          }
        } catch { surahName = `Chapter ${chapterId}`; }
      }

      if (!mountedRef.current) return;

      if (arabic && english && verseKey) {
        // All three fields populated — set the real verse
        setVerse({ arabic, english, surahName, verseKey });
      } else {
        // Partial failure — pick a random built-in fallback (not always the same one)
        setVerse(randomFallback());
      }
    } catch {
      if (mountedRef.current) setVerse(randomFallback());
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchRandomVerse();
    const interval = setInterval(fetchRandomVerse, 60000);
    return () => { mountedRef.current = false; clearInterval(interval); };
  }, [fetchRandomVerse]);

  return { verse, loading, fetchNewVerse: fetchRandomVerse };
}
