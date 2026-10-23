"use client";

import { useEffect, useRef } from "react";

/**
 * Synchronizes API query parameters into the browser's route URL (address bar).
 *
 * - Skips 'All'/'ALL', empty strings, null, and undefined values so the URL stays clean.
 * - Updates window.history.replaceState whenever parameters change.
 */
export function useSyncParamsToUrl(params: Record<string, any>) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sp = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const str = String(value).trim();
      if (str === "") return;
      // Do not include 'All' / 'ALL' as they represent no filter in the API
      if (str === "All" || str === "ALL") return;
      sp.set(key, str);
    });

    const queryString = sp.toString();
    const targetSearch = queryString ? `?${queryString}` : "";

    if (window.location.search !== targetSearch) {
      const newUrl = queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname;
      window.history.replaceState(null, "", newUrl);
    }
  }, [JSON.stringify(params)]);
}

/**
 * Reads initial URL search params on client mount to initialize state from URL if present.
 */
export function useInitFromUrl(initMap: Record<string, (val: string) => void>) {
  const initialized = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || initialized.current) return;
    initialized.current = true;

    const sp = new URLSearchParams(window.location.search);
    Object.entries(initMap).forEach(([key, setter]) => {
      const val = sp.get(key);
      if (val !== null && val.trim() !== "") {
        setter(val.trim());
      }
    });
  }, []);
}
