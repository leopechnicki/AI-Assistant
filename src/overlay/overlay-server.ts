import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";

const OVERLAY_PATH_PREFIX = "/overlay";

let cachedHtml: string | null = null;

function loadOverlayHtml(): string | null {
  if (cachedHtml !== null) {
    return cachedHtml;
  }
  const here = path.dirname(fileURLToPath(import.meta.url));
  const htmlPath = path.resolve(here, "overlay.html");
  if (!fs.existsSync(htmlPath)) {
    return null;
  }
  cachedHtml = fs.readFileSync(htmlPath, "utf8");
  return cachedHtml;
}

/**
 * Serve the overlay HTML page at /overlay.
 * The overlay connects via WebSocket to the same gateway server.
 */
export function handleOverlayHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts?: { basePath?: string },
): boolean {
  const url = req.url;
  if (!url) {
    return false;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    return false;
  }

  const parsed = new URL(url, "http://localhost");
  const basePath = opts?.basePath ?? "";
  const overlayPath = basePath ? `${basePath}${OVERLAY_PATH_PREFIX}` : OVERLAY_PATH_PREFIX;

  if (parsed.pathname !== overlayPath && parsed.pathname !== `${overlayPath}/`) {
    return false;
  }

  const html = loadOverlayHtml();
  if (!html) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Overlay page not found");
    return true;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.end(html);
  return true;
}
