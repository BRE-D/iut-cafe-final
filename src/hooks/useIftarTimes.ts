import { useState, useEffect, useRef } from "react";

interface IftarTimes {
  [division: string]: string;
}

// Using lat/lng — far more reliable than city name for BD divisions
const divisions = [
  { name: "Dhaka", lat: 23.8103, lng: 90.4125 },
  { name: "Chattogram", lat: 22.3569, lng: 91.7832 },
  { name: "Rajshahi", lat: 24.3745, lng: 88.6042 },
  { name: "Khulna", lat: 22.8456, lng: 89.5403 },
  { name: "Barishal", lat: 22.7010, lng: 90.3535 },
  { name: "Sylhet", lat: 24.8949, lng: 91.8687 },
  { name: "Rangpur", lat: 25.7439, lng: 89.2752 },
  { name: "Mymensingh", lat: 24.7471, lng: 90.4203 },
];

function to12h(time24: string): string {
  const clean = time24.split(" ")[0];
  const [h, m] = clean.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getRawTime(time24: string): string {
  return time24.split(" ")[0];
}

/** Fetch Maghrib times for a specific date offset from today (0 = today, 1 = tomorrow). */
async function fetchIftarForOffset(dayOffset: number) {
  const target = new Date();
  target.setDate(target.getDate() + dayOffset);
  const dd = String(target.getDate()).padStart(2, "0");
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const yyyy = target.getFullYear();
  const dateStr = `${dd}-${mm}-${yyyy}`;

  const results = await Promise.allSettled(
    divisions.map(async (d) => {
      const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${d.lat}&longitude=${d.lng}&method=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const maghrib: string = data.data.timings.Maghrib;
      return { name: d.name, time: to12h(maghrib), raw: getRawTime(maghrib) };
    })
  );

  const times: IftarTimes = {};
  let dhakaIftar: Date | null = null;

  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      times[r.value.name] = r.value.time;
      if (r.value.name === "Dhaka") {
        const [h, m] = r.value.raw.split(":").map(Number);
        // Build the iftar Date for the correct calendar day
        dhakaIftar = new Date(
          target.getFullYear(), target.getMonth(), target.getDate(), h, m, 0
        );
      }
    } else {
      times[divisions[i].name] = "N/A";
    }
  });

  return { times, dhakaIftar };
}

export function useIftarTimes() {
  const [times, setTimes] = useState<IftarTimes>({});
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<string>("Loading...");
  const [dhakaIftarTime, setDhakaIftarTime] = useState<Date | null>(null);
  // true while showing "Iftar Time!" banner (first 15 min after iftar)
  const [isIftarWindow, setIsIftarWindow] = useState(false);
  const switchedToTomorrowRef = useRef(false);
  const mountedRef = useRef(true);

  // ── Initial fetch (today) ──────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    switchedToTomorrowRef.current = false;

    async function loadToday() {
      setLoading(true);
      try {
        const { times: t, dhakaIftar } = await fetchIftarForOffset(0);
        if (!mountedRef.current) return;
        setTimes(t);
        setDhakaIftarTime(dhakaIftar);
      } catch { /* silently ignore */ }
      if (mountedRef.current) setLoading(false);
    }

    loadToday();

    // Re-fetch at midnight for the new day
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const msToMidnight = midnight.getTime() - now.getTime();
    const midnightTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      switchedToTomorrowRef.current = false;
      loadToday();
    }, msToMidnight);

    return () => {
      mountedRef.current = false;
      clearTimeout(midnightTimer);
    };
  }, []);

  // ── Countdown ticker ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!dhakaIftarTime) return;

    const tick = async () => {
      const now = Date.now();
      const diff = dhakaIftarTime.getTime() - now;
      const POST_IFTAR_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

      if (diff > 0) {
        // Still counting down to today's / tomorrow's iftar
        setIsIftarWindow(false);
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setCountdown(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      } else if (-diff < POST_IFTAR_WINDOW_MS) {
        // Within the 15-minute Iftar celebration window
        setIsIftarWindow(true);
        setCountdown("🌙 Iftar Time!");
      } else {
        // More than 15 minutes past iftar — switch to tomorrow's time
        setIsIftarWindow(false);
        if (!switchedToTomorrowRef.current) {
          switchedToTomorrowRef.current = true;
          setCountdown("Loading...");
          try {
            const { times: t, dhakaIftar } = await fetchIftarForOffset(1);
            if (!mountedRef.current) return;
            setTimes(t);
            if (dhakaIftar) setDhakaIftarTime(dhakaIftar); // triggers re-run of this effect
          } catch { /* silently ignore */ }
        }
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dhakaIftarTime]);

  return { times, loading, countdown, dhakaIftarTime, isIftarWindow };
}
