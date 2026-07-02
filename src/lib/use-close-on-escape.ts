"use client";

import * as React from "react";

/** Closes a modal/dialog when the user presses Escape. */
export function useCloseOnEscape(onClose: () => void) {
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}
