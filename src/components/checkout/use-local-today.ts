"use client";

import { useSyncExternalStore } from "react";
import { localCalendarDate } from "@/lib/orders";

function subscribe(listener: () => void) {
  const timer = window.setInterval(listener, 60_000);
  window.addEventListener("focus", listener);
  return () => { window.clearInterval(timer); window.removeEventListener("focus", listener); };
}

function snapshot() { return localCalendarDate(new Date()); }
function serverSnapshot() { return ""; }

/** Empty during server rendering; device-local day becomes available after hydration. */
export function useLocalToday(): string {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
