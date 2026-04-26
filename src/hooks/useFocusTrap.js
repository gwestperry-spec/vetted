import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusable(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)).filter(
    (el) => !el.closest("[inert]") && el.offsetParent !== null
  );
}

// Traps keyboard focus inside `ref` while mounted.
// Calls onClose when Escape is pressed.
// Restores focus to the previously active element on unmount.
export function useFocusTrap(ref, { onClose } = {}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement;

    // Move focus into the trap on open
    const focusable = getFocusable(container);
    if (focusable.length) focusable[0].focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;

      const nodes = getFocusable(container);
      if (!nodes.length) { e.preventDefault(); return; }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

// Moves focus to the container on mount (for page-level views, not modals).
// Adds Escape key handler without trapping Tab navigation.
export function useFocusOnMount(ref, { onEscape } = {}) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement;
    container.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onEscapeRef.current?.();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
