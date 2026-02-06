import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { OPENAI_DEFAULT_MODEL } from "./openai-model-default.js";

describe("onboard (non-interactive): OpenAI API key", () => {
  it("stores OPENAI_API_KEY and configures the OpenAI default model", async () => {
    const prev = {
      home: process.env.HOME,
      stateDir: process.env.HEX_STATE_DIR,
      configPath: process.env.HEX_CONFIG_PATH,
      skipChannels: process.env.HEX_SKIP_CHANNELS,
      skipGmail: process.env.HEX_SKIP_GMAIL_WATCHER,
      skipCron: process.env.HEX_SKIP_CRON,
      skipCanvas: process.env.HEX_SKIP_CANVAS_HOST,
      token: process.env.HEX_GATEWAY_TOKEN,
      password: process.env.HEX_GATEWAY_PASSWORD,
    };

    process.env.HEX_SKIP_CHANNELS = "1";
    process.env.HEX_SKIP_GMAIL_WATCHER = "1";
    process.env.HEX_SKIP_CRON = "1";
    process.env.HEX_SKIP_CANVAS_HOST = "1";
    delete process.env.HEX_GATEWAY_TOKEN;
    delete process.env.HEX_GATEWAY_PASSWORD;

    const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "hex-onboard-openai-"));
    process.env.HOME = tempHome;
    process.env.HEX_STATE_DIR = tempHome;
    process.env.HEX_CONFIG_PATH = path.join(tempHome, "hex.json");
    vi.resetModules();

    const runtime = {
      log: () => {},
      error: (msg: string) => {
        throw new Error(msg);
      },
      exit: (code: number) => {
        throw new Error(`exit:${code}`);
      },
    };

    try {
      const { runNonInteractiveOnboarding } = await import("./onboard-non-interactive.js");
      await runNonInteractiveOnboarding(
        {
          nonInteractive: true,
          authChoice: "openai-api-key",
          openaiApiKey: "sk-openai-test",
          skipHealth: true,
          skipChannels: true,
          skipSkills: true,
          json: true,
        },
        runtime,
      );

      const { CONFIG_PATH } = await import("../config/config.js");
      const cfg = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8")) as {
        agents?: { defaults?: { model?: { primary?: string } } };
      };
      expect(cfg.agents?.defaults?.model?.primary).toBe(OPENAI_DEFAULT_MODEL);
    } finally {
      await fs.rm(tempHome, { recursive: true, force: true });
      process.env.HOME = prev.home;
      process.env.HEX_STATE_DIR = prev.stateDir;
      process.env.HEX_CONFIG_PATH = prev.configPath;
      process.env.HEX_SKIP_CHANNELS = prev.skipChannels;
      process.env.HEX_SKIP_GMAIL_WATCHER = prev.skipGmail;
      process.env.HEX_SKIP_CRON = prev.skipCron;
      process.env.HEX_SKIP_CANVAS_HOST = prev.skipCanvas;
      process.env.HEX_GATEWAY_TOKEN = prev.token;
      process.env.HEX_GATEWAY_PASSWORD = prev.password;
    }
  }, 60_000);
});
