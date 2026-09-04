"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MAX_TEXT_LENGTH, STORAGE_KEY, assertValidText } from "@/lib/display-state";
import { registerDisplayTool } from "@/lib/webmcp";

export function Display() {
  const [text, setTextState] = useState("");
  const textRef = useRef<HTMLParagraphElement>(null);

  const setText = useCallback((nextText: string) => {
    assertValidText(nextText);
    setTextState(nextText);
    try { localStorage.setItem(STORAGE_KEY, nextText); } catch { /* Storage is optional. */ }
  }, []);

  useEffect(() => {
    let active = true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null && stored.length <= MAX_TEXT_LENGTH) {
        queueMicrotask(() => { if (active) setTextState(stored); });
      }
    } catch { /* Keep the empty initial display. */ }
    return () => { active = false; };
  }, []);

  useEffect(() => registerDisplayTool(setText), [setText]);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) return;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const maxSize = Math.min(160, window.innerWidth * 0.1, window.innerHeight * 0.22);
        let low = 12;
        let high = Math.max(low, maxSize);
        for (let index = 0; index < 12; index += 1) {
          const candidate = (low + high) / 2;
          element.style.fontSize = `${candidate}px`;
          const fits = element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1;
          if (fits) low = candidate;
          else high = candidate;
        }
        element.style.fontSize = `${Math.floor(low * 10) / 10}px`;
      });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    fit();
    document.fonts?.ready.then(fit);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [text]);

  return (
    <main className="display" data-testid="display">
      <p ref={textRef} className="displayText" aria-live="polite" data-testid="display-text">{text}</p>
    </main>
  );
}
