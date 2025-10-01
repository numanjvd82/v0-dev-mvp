"use client";
// Renders hover/selection outlines over the iframe content plus the contextual toolbar.
// Uses Framer Motion for subtle animations.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePreviewStore } from "@/lib/previewStore";
// Using the new Motion package ("motion") instead of legacy framer-motion import path.
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button"; // relative path
import { Trash2, Pencil, RefreshCw, X } from "lucide-react";

// Helper to translate iframe-relative rect to page coordinates.
function toAbsolute(
  rect: { x: number; y: number; width: number; height: number },
  iframeRect?: DOMRect
) {
  if (!iframeRect) return rect;
  return {
    x: iframeRect.left + rect.x,
    y: iframeRect.top + rect.y,
    width: rect.width,
    height: rect.height,
  };
}

export const PreviewOverlay: React.FC = () => {
  const hover = usePreviewStore((s) => s.hover);
  const selected = usePreviewStore((s) => s.selected);
  const iframeRect = usePreviewStore((s) => s.iframeRect);
  const setSelected = usePreviewStore((s) => s.setSelected);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  // Measure container rect so we can convert viewport-based iframe rect into container-relative coords.
  useLayoutEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerRect(containerRef.current.getBoundingClientRect());
      }
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, []);

  const active = hover || selected;

  // Base offset from iframe (viewport) to container (viewport) so elements align even with header offsets.
  const baseLeft =
    iframeRect && containerRect ? iframeRect.left - containerRect.left : 0;
  const baseTop =
    iframeRect && containerRect ? iframeRect.top - containerRect.top : 0;

  // Helper to position any rect relative to container.
  function place(rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) {
    if (!rect) return undefined;
    return {
      left: baseLeft + rect.x,
      top: baseTop + rect.y,
      width: rect.width,
      height: rect.height,
    };
  }

  const hoverPos = hover ? place(hover.rect) : undefined;
  const selectedPos = selected ? place(selected.rect) : undefined;
  const activePos = active ? place(active.rect) : undefined;

  // When toolbar is present, we want pointer events to pass through everywhere EXCEPT the toolbar itself.
  // Container is pointer-events-none; toolbar div will re-enable pointer-events-auto.
  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-40"
    >
      <AnimatePresence>
        {hover && hoverPos && (
          <motion.div
            key={"hover" + hover.nodeId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute border border-blue-500/60 bg-blue-500/10 rounded-sm"
            style={hoverPos as any}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selected && selectedPos && (
          <motion.div
            key={"sel" + selected.nodeId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute border-2 border-amber-500/80 rounded-sm"
            style={selectedPos as any}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {active && activePos && (
          <motion.div
            key={"tb" + active.nodeId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute pointer-events-auto"
            style={{
              left: activePos.left,
              top: Math.max(4, activePos.top - 40), // 40px above element
            }}
            // Stop events so underlying iframe element isn't clicked while interacting with toolbar
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1 rounded-md bg-background/90 backdrop-blur border shadow-sm px-1 py-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground px-1">
                {active.tag}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                title="Clear selection"
                onClick={() => {
                  if (selected) {
                    usePreviewStore.getState().setSelected(undefined);
                    // Inform iframe to clear internal selectedEl
                    window.postMessage(
                      {
                        ns: "preview-bridge-parent",
                        data: { type: "unselect" },
                      },
                      "*"
                    );
                  }
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => setSelected(active)}
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                title="Replace (placeholder)"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Delete (placeholder)"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
