"use client";

// Prototype main page for AI-powered web builder
// Provides: prompt input, mock AI generation, preview iframe, overlay with toolbar.

import { useState } from "react";
import { Button } from "../components/ui/button";
import { PreviewFrame } from "../components/PreviewFrame";
import { PreviewOverlay } from "../components/PreviewOverlay";
import { usePreviewStore, PreviewState } from "@/lib/previewStore";
import { Sparkles, RefreshCw } from "lucide-react";

export default function Home() {
  const [input, setInput] = useState(
    "A landing hero with headline and CTA and three feature cards"
  );
  const generated = usePreviewStore((s: PreviewState) => s.generated);
  const setGenerated = usePreviewStore((s: PreviewState) => s.setGenerated);
  const isGenerating = usePreviewStore((s: PreviewState) => s.isGenerating);
  const setIsGenerating = usePreviewStore(
    (s: PreviewState) => s.setIsGenerating
  );

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      // Server returns { code } with raw HTML/JSX snippet (no fences)
      setGenerated(data.code || "");
    } catch (e: any) {
      setGenerated(
        `<div style='padding:2rem;font-family:system-ui;color:#b00'>Error: ${e.message}</div>`
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function handleReset() {
    setGenerated("");
    // Clear any lingering hover/selection overlays when iframe unmounts
    const store = (usePreviewStore as any).getState();
    store.setHover(undefined);
    store.setSelected(undefined);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar with prompt input */}
      <header className="border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
              placeholder="Prompt or paste JSX..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-1"
          >
            <Sparkles className="h-4 w-4" />{" "}
            {isGenerating ? "Generating" : "Generate"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
            disabled={isGenerating}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>
      {/* Workspace area */}
      <main className="flex-1 relative">
        <div className="h-full w-full relative flex items-stretch min-h-[600px]">
          {generated ? (
            <>
              <PreviewFrame />
              <PreviewOverlay />
            </>
          ) : (
            <div className="m-auto text-center max-w-md p-8 text-sm text-muted-foreground select-none">
              <p className="mb-3 font-medium text-foreground">No preview yet</p>
              <p className="mb-4">
                Enter a prompt (or paste JSX) and click Generate to mount the
                sandboxed preview iframe.
              </p>
              {isGenerating && (
                <p className="animate-pulse text-xs">Generating...</p>
              )}
            </div>
          )}
        </div>
      </main>
      <footer className="border-t text-xs text-muted-foreground p-3 flex items-center gap-3 justify-center">
        Prototype • Hover elements to see toolbar • Click to select
      </footer>
    </div>
  );
}
