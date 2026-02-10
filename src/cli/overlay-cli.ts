import type { Command } from "commander";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";

export function registerOverlayCli(program: Command) {
  program
    .command("overlay")
    .description("Open the AI overlay (transparent floating assistant window)")
    .option("--url <url>", "Gateway URL (defaults to http://localhost:18789)")
    .option("--token <token>", "Gateway token (if required)")
    .option("--port <port>", "Gateway port (default: 18789)")
    .option("--session <key>", 'Session key (default: "overlay")')
    .option("--no-browser", "Print the overlay URL instead of opening it")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Overlay opens a transparent floating AI window in your browser.")}\n` +
        `${theme.muted("Use Ctrl+Shift+H to toggle visibility, Ctrl+Shift+M to minimize.")}\n`,
    )
    .action(async (opts) => {
      try {
        const port = opts.port ?? "18789";
        const baseUrl = opts.url ?? `http://localhost:${port}`;
        const session = opts.session ?? "overlay";
        const token = opts.token ?? "";

        // Build WebSocket URL from base URL
        const parsedBase = new URL(baseUrl);
        const wsProtocol = parsedBase.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${wsProtocol}//${parsedBase.host}`;

        const overlayUrl = new URL("/overlay", baseUrl);
        overlayUrl.searchParams.set("ws", wsUrl);
        overlayUrl.searchParams.set("session", session);
        if (token) {
          overlayUrl.searchParams.set("token", token);
        }

        const url = overlayUrl.toString();

        if (opts.browser === false) {
          defaultRuntime.log(url);
          return;
        }

        defaultRuntime.log(`Opening overlay: ${url}`);

        const { openUrl } = await import("../commands/onboard-helpers.js");
        await openUrl(url);
      } catch (err) {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    });
}
