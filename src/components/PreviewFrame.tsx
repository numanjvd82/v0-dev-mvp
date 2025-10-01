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
      let id=0, lastHover=null, selectedEl=null;
      function assign(root){ if(!root) return; const w=document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT); while(w.nextNode()){ const el=w.currentNode; if(el instanceof HTMLElement && !el.dataset.nodeId){ el.dataset.nodeId='n'+(++id); } } }
      function payload(el){ const r=el.getBoundingClientRect(); return { nodeId:el.dataset.nodeId, tag:el.tagName.toLowerCase(), rect:{ x:r.x,y:r.y,width:r.width,height:r.height } }; }
      const ro=new ResizeObserver(es=>{ for(const e of es){ const el=e.target; if(!(el instanceof HTMLElement) || !el.dataset.nodeId) continue; if(el===selectedEl || el===lastHover){ const r=el.getBoundingClientRect(); post({ type:'mutation', payload:{ nodeId:el.dataset.nodeId, rect:{ x:r.x,y:r.y,width:r.width,height:r.height } } }); } } });
      function observe(){ document.querySelectorAll('[data-node-id]').forEach(el=>ro.observe(el)); }
      assign(document.getElementById('__ai_root')); observe(); post({ type:'init' });
      document.addEventListener('mouseover', e=>{ const el=e.target; if(!(el instanceof HTMLElement) || !el.dataset.nodeId) return; lastHover=el; post({ type:'hover', payload: payload(el) }); }, true);
      document.addEventListener('mouseout', e=>{ const el=e.target; if(!(el instanceof HTMLElement)) return; if(lastHover===el){ post({ type:'leave', payload:{ nodeId:el.dataset.nodeId } }); lastHover=null; } }, true);
      document.addEventListener('click', e=>{ 
        let el=e.target; 
        if(!(el instanceof HTMLElement)) return; 
        while(el && !(el instanceof HTMLElement && el.dataset && el.dataset.nodeId)) el = el.parentElement; 
        if(!(el instanceof HTMLElement) || !el.dataset.nodeId) return; 
        e.preventDefault(); e.stopPropagation();
        selectedEl=el; post({ type:'click', payload: payload(el) });
      }, true);
      // Sync positions during scroll (throttled by rAF)
      let scrollPending=false; function flush(){ scrollPending=false; if(selectedEl) post({ type:'click', payload: payload(selectedEl) }); if(lastHover) post({ type:'hover', payload: payload(lastHover) }); }
      document.addEventListener('scroll', ()=>{ if(!scrollPending){ scrollPending=true; requestAnimationFrame(flush); } }, true);
      // Escape key clears selection
      document.addEventListener('keydown', e=>{ if(e.key==='Escape' && selectedEl){ const id=selectedEl.dataset.nodeId; selectedEl=null; post({ type:'unselect', payload:{ nodeId:id } }); } }, true);
      // Parent -> iframe unselect
      window.addEventListener('message', ev=>{ const d=ev.data; if(!d||d.ns!=='preview-bridge-parent') return; const m=d.data; if(m&&m.type==='unselect' && selectedEl){ const id=selectedEl.dataset.nodeId; selectedEl=null; post({ type:'unselect', payload:{ nodeId:id } }); } });
    })();</script>
    </body></html>`,
    [safeHTML]
  );

  // Listen for messages from the iframe instrumentation and update store (hover, selection, mutations)
  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      const { data, source } = ev as any;
      if (!data || data.ns !== "preview-bridge") return;
      // Only accept messages from our iframe
      if (iframeRef.current && source !== iframeRef.current.contentWindow)
        return;
      const msg = data.data;
      if (!msg || !msg.type) return;
      const store = usePreviewStore.getState();
      switch (msg.type) {
        case "hover": {
          const { nodeId, tag, rect } = msg.payload || {};
          if (nodeId && rect) {
            store.setHover({
              nodeId,
              tag,
              rect: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              },
            });
          }
          break;
        }
        case "leave": {
          store.setHover(undefined);
          break;
        }
        case "click": {
          const { nodeId, tag, rect } = msg.payload || {};
          if (nodeId && rect) {
            store.setSelected({
              nodeId,
              tag,
              rect: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              },
            });
          }
          break;
        }
        case "unselect": {
          store.setSelected(undefined);
          break;
        }
        case "mutation": {
          const { nodeId, rect } = msg.payload || {};
          if (nodeId && rect) {
            store.updateHoverRect(nodeId, {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            });
          }
          break;
        }
        case "init": {
          // Re-sync iframe rect when the doc initializes
          const el = iframeRef.current;
          if (el) {
            const r = el.getBoundingClientRect();
            store.setIframeRect(r as DOMRect);
          }
          break;
        }
        default:
          break;
      }
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
