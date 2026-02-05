import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveGatewayStateDir } from "./paths.js";

describe("resolveGatewayStateDir", () => {
  it("uses the default state dir when no overrides are set", () => {
    const env = { HOME: "/Users/test" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".hex"));
  });

  it("appends the profile suffix when set", () => {
    const env = { HOME: "/Users/test", HEX_PROFILE: "rescue" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".hex-rescue"));
  });

  it("treats default profiles as the base state dir", () => {
    const env = { HOME: "/Users/test", HEX_PROFILE: "Default" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".hex"));
  });

  it("uses HEX_STATE_DIR when provided", () => {
    const env = { HOME: "/Users/test", HEX_STATE_DIR: "/var/lib/hex" };
    expect(resolveGatewayStateDir(env)).toBe(path.resolve("/var/lib/hex"));
  });

  it("expands ~ in HEX_STATE_DIR", () => {
    const env = { HOME: "/Users/test", HEX_STATE_DIR: "~/hex-state" };
    expect(resolveGatewayStateDir(env)).toBe(path.resolve("/Users/test/hex-state"));
  });

  it("preserves Windows absolute paths without HOME", () => {
    const env = { HEX_STATE_DIR: "C:\\State\\hex" };
    expect(resolveGatewayStateDir(env)).toBe("C:\\State\\hex");
  });
});
