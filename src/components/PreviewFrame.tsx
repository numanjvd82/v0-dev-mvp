"use client";
// Inline preview iframe using srcDoc. Rebuilds isolated HTML each content change.
import { useEffect, useMemo, useRef } from "react";
import { usePreviewStore } from "@/lib/previewStore";

export const PreviewFrame: React.FC = () => {
  const generated = usePreviewStore((s) => s.generated);
  const setIframeMounted = usePreviewStore((s) => s.setIframeMounted);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const placeholder =
    "<div style='padding:2rem;color:#666;font:14px system-ui'>No content yet. Enter a prompt and click Generate.</div>";

  // Escape closing script tags in generated HTML to avoid breaking our instrumentation script block
  const safeHTML = (generated || placeholder)
    .replace(/<script/gi, "&lt;script")
    .replace(/<\/script>/gi, "");

  const srcDoc = useMemo(
    () => `<!DOCTYPE html><html><head><meta charset='utf-8'/><style>
      html,body{margin:0;font-family:system-ui,sans-serif}body{padding:0}
      [data-node-id]:hover{outline:1px dashed rgba(0,0,0,.25)}
    </style></head><body>
    <div id="__ai_root">${safeHTML}</div>
    <script>(function(){
      const NS='preview-bridge';
      function post(m){ parent.postMessage({ ns:NS, data:m }, '*'); }
      let id=0, lastHover=null;
      function assign(root){ if(!root) return; const w=document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT); while(w.nextNode()){ const el=w.currentNode; if(el instanceof HTMLElement && !el.dataset.nodeId){ el.dataset.nodeId='n'+(++id); } } }
      function payload(el){ const r=el.getBoundingClientRect(); return { nodeId:el.dataset.nodeId, tag:el.tagName.toLowerCase(), rect:{ x:r.x,y:r.y,width:r.width,height:r.height } }; }
      const ro=new ResizeObserver(es=>{ for(const e of es){ const el=e.target; if(!(el instanceof HTMLElement) || !el.dataset.nodeId) continue; const r=el.getBoundingClientRect(); post({ type:'mutation', payload:{ nodeId:el.dataset.nodeId, rect:{ x:r.x,y:r.y,width:r.width,height:r.height, top:r.top,left:r.left,right:r.right,bottom:r.bottom } } }); } });
      function observe(){ document.querySelectorAll('[data-node-id]').forEach(el=>ro.observe(el)); }
      assign(document.getElementById('__ai_root')); observe(); post({ type:'init' });
      document.addEventListener('mouseover', e=>{ const el=e.target; if(!(el instanceof HTMLElement) || !el.dataset.nodeId) return; lastHover=el; post({ type:'hover', payload: payload(el) }); }, true);
      document.addEventListener('mouseout', e=>{ const el=e.target; if(!(el instanceof HTMLElement)) return; if(lastHover===el){ post({ type:'leave', payload:{ nodeId:el.dataset.nodeId } }); lastHover=null; } }, true);
      document.addEventListener('click', e=>{ const el=e.target; if(!(el instanceof HTMLElement) || !el.dataset.nodeId) return; e.preventDefault(); e.stopPropagation(); post({ type:'click', payload: payload(el) }); }, true);
    })();</script>
    </body></html>`,
    [safeHTML]
  );

  // Listen for messages (hover / selection updates already handled in parent overlay logic)
  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      // In this inline mode we don't expect inbound messages; reserved for future edits.
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Track iframe rect for overlay positioning
  useEffect(() => {
    const el = iframeRef.current;
    if (!el) return;
    setIframeMounted(true);
    const update = () => {
      const r = el.getBoundingClientRect();
      usePreviewStore.getState().setIframeRect(r as DOMRect);
    };
    update();
    window.addEventListener("resize", update);
    const id = setInterval(update, 1000);
    return () => {
      window.removeEventListener("resize", update);
      clearInterval(id);
    };
  }, [generated, setIframeMounted]);

  return (
    <div className="relative flex-1 bg-muted/20 overflow-auto">
      <iframe
        ref={iframeRef}
        key={safeHTML.length} // force refresh when content length changes (simple heuristic)
        title="preview"
        className="w-full min-h-[800px] border-0 bg-white"
        srcDoc={srcDoc}
      />
    </div>
  );
};
