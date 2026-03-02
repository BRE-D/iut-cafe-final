import React from "react";

interface Verse {
  arabic: string;
  english: string;
  surahName: string;
  verseKey: string;
}

export default function QuranVerseCard({ verse, loading }: { verse: Verse; loading: boolean }) {
  return (
    <div
      className="relative rounded-xl p-6 overflow-hidden transition-all duration-300"
      style={{
        background: "var(--bg-card)",
        borderLeft: "4px solid var(--iut-green)",
        border: "1px solid var(--border-color)",
        borderLeftWidth: "4px",
        borderLeftColor: "var(--iut-green)",
        boxShadow: "0 2px 16px var(--border-color)",
        animation: "fadeIn 0.5s ease",
      }}
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(74,222,128,0.03), transparent)",
          animation: "shimmer 4s ease-in-out infinite",
        }}
      />

      <div className="flex items-center justify-between mb-4 relative">
        <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--iut-green)" }}>
          ✦ Verse of the Moment
        </span>
        <span className="text-lg">🌙</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[100, 85, 70].map((w, i) => (
            <div key={i} className="h-4 rounded"
              style={{ background: "var(--border-color)", width: `${w}%`, animation: "shimmer 2s infinite" }} />
          ))}
        </div>
      ) : (
        <div className="relative" style={{ animation: "fadeIn 0.5s ease" }}>
          <p
            className="text-2xl leading-loose mb-4"
            style={{ fontFamily: "Amiri, serif", color: "var(--iut-green)", textAlign: "right", direction: "rtl", lineHeight: 2 }}
          >
            {verse.arabic}
          </p>
          <div className="h-px my-4" style={{ background: "var(--border-color)" }} />
          <p className="italic text-base leading-relaxed" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            "{verse.english}"
          </p>
          <p className="text-sm mt-3 text-right font-medium" style={{ color: "var(--accent-gold)" }}>
            — Surah {verse.surahName}, {verse.verseKey}
          </p>
        </div>
      )}
    </div>
  );
}
