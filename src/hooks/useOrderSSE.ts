import { useState, useEffect, useRef, useCallback } from "react";
import { subscribeToOrders, getSessionOrders } from "@/lib/api";

const NOTIFICATION_URL = import.meta.env.VITE_SSE_URL || import.meta.env.VITE_NOTIFICATION_URL || "";
const API_BASE = import.meta.env.VITE_API_URL || "/api";

const STAGES = ["Pending", "Stock Verified", "In Kitchen", "Ready"];
const STAGE_DELAYS = [0, 2000, 6000, 14000]; // ms after order placed

interface HistoryEntry {
  status: string;
  timestamp: string;
}

function isMockMode() {
  return API_BASE === "/api" || API_BASE === "";
}

export function useOrderSSE({
  studentId,
  orderId,
  enabled,
}: {
  studentId: string | null;
  orderId: string | null;
  enabled: boolean;
}) {
  const [status, setStatus] = useState<string>("Pending");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Reset whenever a new order starts
  useEffect(() => {
    if (enabled && orderId) {
      setStatus("Pending");
      setHistory([{ status: "Pending", timestamp: new Date().toISOString() }]);
    }
  }, [orderId, enabled]);

  useEffect(() => {
    if (!enabled || !studentId || !orderId) return;

    // ── Mock mode: simulate status progression with timers ──────────────
    if (isMockMode() || !NOTIFICATION_URL) {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];

      STAGES.forEach((stage, i) => {
        if (i === 0) return; // "Pending" already set above
        const timer = setTimeout(() => {
          setStatus(stage);
          setHistory((prev) => [
            ...prev,
            { status: stage, timestamp: new Date().toISOString() },
          ]);
        }, STAGE_DELAYS[i]);
        timersRef.current.push(timer);
      });

      setIsConnected(true);
      return () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
        setIsConnected(false);
      };
    }

    // ── Real backend: SSE connection ────────────────────────────────────
    const url = `${NOTIFICATION_URL}/${studentId}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setIsConnected(true);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "orderUpdate" && (!orderId || data.orderId === orderId)) {
          setStatus(data.status);
          setHistory((prev) => [
            ...prev,
            { status: data.status, timestamp: data.timestamp || new Date().toISOString() },
          ]);
        }
      } catch {
        console.warn("SSE parse error");
      }
    };
    es.onerror = () => {
      console.warn("SSE error — falling back to mock progression");
      es.close();
      // Fall back to timer simulation if SSE fails
      STAGES.forEach((stage, i) => {
        if (i === 0) return;
        const timer = setTimeout(() => {
          setStatus(stage);
          setHistory((prev) => [
            ...prev,
            { status: stage, timestamp: new Date().toISOString() },
          ]);
        }, STAGE_DELAYS[i]);
        timersRef.current.push(timer);
      });
    };

    return () => {
      es.close();
      esRef.current = null;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setIsConnected(false);
    };
  }, [studentId, orderId, enabled]);

  // Listen for manual admin status updates
  useEffect(() => {
    if (!enabled || !studentId || !orderId) return;

    const onUpdate = () => {
      const orders = getSessionOrders(studentId);
      const current = orders.find(o => o.orderId === orderId);
      if (current && current.status !== status) {
        setStatus(current.status);
        setHistory(prev => {
          // Only add to history if this status isn't already the last one
          if (prev.length > 0 && prev[prev.length - 1].status === current.status) return prev;
          return [...prev, { status: current.status, timestamp: new Date().toISOString() }];
        });
      }
    };

    return subscribeToOrders(onUpdate);
  }, [enabled, studentId, orderId, status]);

  return { status, history, isConnected };
}
