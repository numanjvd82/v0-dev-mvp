"use client";
// Zustand store for managing generated code, hover/selection state, and frame measurements.
import { create } from "zustand";

export interface HoverTarget {
  // A unique id assigned inside the iframe to each element we instrument.
  nodeId: string;
  // Bounding client rect relative to the iframe viewport.
  rect: { x: number; y: number; width: number; height: number };
  // Raw tag name for display / debugging.
  tag: string;
}

export interface PreviewState {
  generated: string;
  isGenerating: boolean;
  hover?: HoverTarget;
  selected?: HoverTarget;
  iframeMounted: boolean;
  iframeRect?: DOMRect;
  setGenerated: (html: string) => void;
  setIsGenerating: (b: boolean) => void;
  setHover: (h?: HoverTarget) => void;
  setSelected: (s?: HoverTarget) => void;
  setIframeMounted: (v: boolean) => void;
  setIframeRect: (r?: DOMRect) => void;
  updateHoverRect: (nodeId: string, rect: HoverTarget["rect"]) => void;
}

export const usePreviewStore = create<PreviewState>((set, get) => ({
  generated: "",
  isGenerating: false,
  iframeMounted: false,
  setGenerated: (html) => set({ generated: html }),
  setIsGenerating: (b) => set({ isGenerating: b }),
  setHover: (h) => set({ hover: h }),
  setSelected: (s) => set({ selected: s }),
  setIframeMounted: (v) => set({ iframeMounted: v }),
  setIframeRect: (r) => set({ iframeRect: r }),
  updateHoverRect: (nodeId, rect) => {
    const { hover, selected } = get();
    if (hover && hover.nodeId === nodeId) set({ hover: { ...hover, rect } });
    if (selected && selected.nodeId === nodeId)
      set({ selected: { ...selected, rect } });
  },
}));
