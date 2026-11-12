"use client";

import { useEffect } from "react";

let openModalsCount = 0;

export function useModalBodyLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    openModalsCount++;
    if (openModalsCount === 1) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      openModalsCount = Math.max(0, openModalsCount - 1);
      if (openModalsCount === 0) {
        document.body.style.overflow = "";
      }
    };
  }, [isOpen]);
}

