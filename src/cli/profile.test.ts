import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "hex",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "hex", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "hex", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "hex", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "hex", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "hex", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "hex", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (dev first)", () => {
    const res = parseCliProfileArgs(["node", "hex", "--dev", "--profile", "work", "status"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (profile first)", () => {
    const res = parseCliProfileArgs(["node", "hex", "--profile", "work", "--dev", "status"]);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join("/home/peter", ".hex-dev");
    expect(env.HEX_PROFILE).toBe("dev");
    expect(env.HEX_STATE_DIR).toBe(expectedStateDir);
    expect(env.HEX_CONFIG_PATH).toBe(path.join(expectedStateDir, "hex.json"));
    expect(env.HEX_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      HEX_STATE_DIR: "/custom",
      HEX_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.HEX_STATE_DIR).toBe("/custom");
    expect(env.HEX_GATEWAY_PORT).toBe("19099");
    expect(env.HEX_CONFIG_PATH).toBe(path.join("/custom", "hex.json"));
  });
});

describe("formatCliCommand", () => {
  it("returns command unchanged when no profile is set", () => {
    expect(formatCliCommand("hex doctor --fix", {})).toBe("hex doctor --fix");
  });

  it("returns command unchanged when profile is default", () => {
    expect(formatCliCommand("hex doctor --fix", { HEX_PROFILE: "default" })).toBe(
      "hex doctor --fix",
    );
  });

  it("returns command unchanged when profile is Default (case-insensitive)", () => {
    expect(formatCliCommand("hex doctor --fix", { HEX_PROFILE: "Default" })).toBe(
      "hex doctor --fix",
    );
  });

  it("returns command unchanged when profile is invalid", () => {
    expect(formatCliCommand("hex doctor --fix", { HEX_PROFILE: "bad profile" })).toBe(
      "hex doctor --fix",
    );
  });

  it("returns command unchanged when --profile is already present", () => {
    expect(
      formatCliCommand("hex --profile work doctor --fix", { HEX_PROFILE: "work" }),
    ).toBe("hex --profile work doctor --fix");
  });

  it("returns command unchanged when --dev is already present", () => {
    expect(formatCliCommand("hex --dev doctor", { HEX_PROFILE: "dev" })).toBe(
      "hex --dev doctor",
    );
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("hex doctor --fix", { HEX_PROFILE: "work" })).toBe(
      "hex --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("hex doctor --fix", { HEX_PROFILE: "  jbhex  " })).toBe(
      "hex --profile jbhex doctor --fix",
    );
  });

  it("handles command with no args after hex", () => {
    expect(formatCliCommand("hex", { HEX_PROFILE: "test" })).toBe(
      "hex --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm hex doctor", { HEX_PROFILE: "work" })).toBe(
      "pnpm hex --profile work doctor",
    );
  });
});
