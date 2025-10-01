"use client";
// Renders hover/selection outlines over the iframe content plus the contextual toolbar.
// Uses Framer Motion for subtle animations.

import { useEffect, useMemo, useRef } from "react";
import { usePreviewStore } from "@/lib/previewStore";
// Using the new Motion package ("motion") instead of legacy framer-motion import path.
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button"; // relative path
import { Trash2, Pencil, RefreshCw } from "lucide-react";

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

  // Decide which element (hover vs selected) drives the toolbar position.
  const active = hover || selected;
  const abs = active ? toAbsolute(active.rect, iframeRect) : undefined;

  // Keep overlay container pointer-events none so page interactions pass through except toolbar.
  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-40"
    >
      {/* Hover outline */}
      <AnimatePresence>
        {hover && iframeRect && (
          <motion.div
            key={"hover" + hover.nodeId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute border border-blue-500/60 bg-blue-500/10 rounded-sm"
            style={{
              left: iframeRect.left + hover.rect.x,
              top: iframeRect.top + hover.rect.y,
              width: hover.rect.width,
              height: hover.rect.height,
            }}
          />
        )}
      </AnimatePresence>
      {/* Selected outline */}
      <AnimatePresence>
        {selected && iframeRect && (
          <motion.div
            key={"sel" + selected.nodeId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute border-2 border-amber-500/80 rounded-sm"
            style={{
              left: iframeRect.left + selected.rect.x,
              top: iframeRect.top + selected.rect.y,
              width: selected.rect.width,
              height: selected.rect.height,
            }}
          />
        )}
      </AnimatePresence>
      {/* Toolbar */}
      <AnimatePresence>
        {active && abs && (
          <motion.div
            key={"tb" + active.nodeId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute pointer-events-auto"
            style={{
              left: abs.x,
              top: Math.max(4, abs.y - 36),
            }}
          >
            <div className="flex items-center gap-1 rounded-md bg-background/90 backdrop-blur border shadow-sm px-1 py-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground px-1">
                {active.tag}
              </span>
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
