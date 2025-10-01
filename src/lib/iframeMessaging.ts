export type IframeOutboundMessage =
  | { type: "init" }
  | { type: "hover"; payload: HoverPayload }
  | { type: "leave"; payload: { nodeId: string } }
  | { type: "click"; payload: HoverPayload }
  | { type: "mutation"; payload: { nodeId: string; rect: DOMRectSerialized } };

export interface DOMRectSerialized {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface HoverPayload {
  nodeId: string;
  tag: string;
  rect: { x: number; y: number; width: number; height: number };
}

export function serializeRect(r: DOMRect | ClientRect): DOMRectSerialized {
  return {
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    top: r.top,
    left: r.left,
    right: r.right,
    bottom: r.bottom,
  };
}

export const MESSAGE_NAMESPACE = "preview-bridge";

export interface FramedMessage<T = IframeOutboundMessage> {
  ns: typeof MESSAGE_NAMESPACE;
  data: T;
}

export function postToParent(win: Window, data: IframeOutboundMessage) {
  win.parent.postMessage(
    { ns: MESSAGE_NAMESPACE, data } satisfies FramedMessage,
    "*"
  );
}
