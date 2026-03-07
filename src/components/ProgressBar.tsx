"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const PROGRESS_COLOR = "#ff5e00";

/**
 * Custom top-of-page progress bar for route transitions.
 * Intercepts <a> clicks within the app and animates a slim bar
 * at the very top of the viewport while the new page loads.
 */
export default function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "completing">("idle");
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cleanup helper ──
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // ── Start the progress bar ──
  const start = useCallback(() => {
    clearTimers();
    setProgress(0);
    setState("loading");

    // Rapidly go to ~15%, then slow trickle
    let current = 0;
    timerRef.current = setInterval(() => {
      current += current < 20 ? 5 : current < 50 ? 2 : current < 80 ? 0.5 : 0.1;
      if (current > 90) current = 90;
      setProgress(current);
    }, 80);
  }, [clearTimers]);

  // ── Complete the progress bar ──
  const complete = useCallback(() => {
    clearTimers();
    setProgress(100);
    setState("completing");

    timeoutRef.current = setTimeout(() => {
      setState("idle");
      setProgress(0);
    }, 400);
  }, [clearTimers]);

  // ── Complete on route change ──
  useEffect(() => {
    if (state === "loading") {
      complete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // ── Intercept link clicks to start progress ──
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Skip external links, hash links, download links, new-tab links
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        target.target === "_blank" ||
        target.hasAttribute("download") ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey
      ) {
        return;
      }

      // Skip if navigating to the same page
      const url = new URL(href, window.location.origin);
      if (url.pathname === pathname && url.search === window.location.search) {
        return;
      }

      start();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname, start]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  if (state === "idle") return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        pointerEvents: "none",
        height: 3,
      }}
    >
      {/* Track background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: `${PROGRESS_COLOR}15`,
        }}
      />

      {/* Progress fill */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: `${progress}%`,
          backgroundColor: PROGRESS_COLOR,
          transition:
            state === "completing"
              ? "width 200ms ease-out, opacity 300ms ease-out 100ms"
              : "width 300ms ease-out",
          opacity: state === "completing" ? 0 : 1,
          boxShadow: `0 0 8px ${PROGRESS_COLOR}80, 0 0 2px ${PROGRESS_COLOR}`,
          borderRadius: "0 2px 2px 0",
        }}
      />

      {/* Glow tip */}
      {state === "loading" && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 80,
            height: "100%",
            transform: `translateX(-${100 - progress}vw)`,
            background: `linear-gradient(to right, transparent, ${PROGRESS_COLOR}60)`,
          }}
        />
      )}
    </div>
  );
}
