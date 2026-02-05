import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it("detects help/version flags", () => {
    expect(hasHelpOrVersion(["node", "hex", "--help"])).toBe(true);
    expect(hasHelpOrVersion(["node", "hex", "-V"])).toBe(true);
    expect(hasHelpOrVersion(["node", "hex", "status"])).toBe(false);
  });

  it("extracts command path ignoring flags and terminator", () => {
    expect(getCommandPath(["node", "hex", "status", "--json"], 2)).toEqual(["status"]);
    expect(getCommandPath(["node", "hex", "agents", "list"], 2)).toEqual(["agents", "list"]);
    expect(getCommandPath(["node", "hex", "status", "--", "ignored"], 2)).toEqual(["status"]);
  });

  it("returns primary command", () => {
    expect(getPrimaryCommand(["node", "hex", "agents", "list"])).toBe("agents");
    expect(getPrimaryCommand(["node", "hex"])).toBeNull();
  });

  it("parses boolean flags and ignores terminator", () => {
    expect(hasFlag(["node", "hex", "status", "--json"], "--json")).toBe(true);
    expect(hasFlag(["node", "hex", "--", "--json"], "--json")).toBe(false);
  });

  it("extracts flag values with equals and missing values", () => {
    expect(getFlagValue(["node", "hex", "status", "--timeout", "5000"], "--timeout")).toBe(
      "5000",
    );
    expect(getFlagValue(["node", "hex", "status", "--timeout=2500"], "--timeout")).toBe(
      "2500",
    );
    expect(getFlagValue(["node", "hex", "status", "--timeout"], "--timeout")).toBeNull();
    expect(getFlagValue(["node", "hex", "status", "--timeout", "--json"], "--timeout")).toBe(
      null,
    );
    expect(getFlagValue(["node", "hex", "--", "--timeout=99"], "--timeout")).toBeUndefined();
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "hex", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "hex", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "hex", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it("parses positive integer flag values", () => {
    expect(getPositiveIntFlagValue(["node", "hex", "status"], "--timeout")).toBeUndefined();
    expect(
      getPositiveIntFlagValue(["node", "hex", "status", "--timeout"], "--timeout"),
    ).toBeNull();
    expect(
      getPositiveIntFlagValue(["node", "hex", "status", "--timeout", "5000"], "--timeout"),
    ).toBe(5000);
    expect(
      getPositiveIntFlagValue(["node", "hex", "status", "--timeout", "nope"], "--timeout"),
    ).toBeUndefined();
  });

  it("builds parse argv from raw args", () => {
    const nodeArgv = buildParseArgv({
      programName: "hex",
      rawArgs: ["node", "hex", "status"],
    });
    expect(nodeArgv).toEqual(["node", "hex", "status"]);

    const versionedNodeArgv = buildParseArgv({
      programName: "hex",
      rawArgs: ["node-22", "hex", "status"],
    });
    expect(versionedNodeArgv).toEqual(["node-22", "hex", "status"]);

    const versionedNodeWindowsArgv = buildParseArgv({
      programName: "hex",
      rawArgs: ["node-22.2.0.exe", "hex", "status"],
    });
    expect(versionedNodeWindowsArgv).toEqual(["node-22.2.0.exe", "hex", "status"]);

    const versionedNodePatchlessArgv = buildParseArgv({
      programName: "hex",
      rawArgs: ["node-22.2", "hex", "status"],
    });
    expect(versionedNodePatchlessArgv).toEqual(["node-22.2", "hex", "status"]);

    const versionedNodeWindowsPatchlessArgv = buildParseArgv({
      programName: "hex",
      rawArgs: ["node-22.2.exe", "hex", "status"],
    });
    expect(versionedNodeWindowsPatchlessArgv).toEqual(["node-22.2.exe", "hex", "status"]);

    const versionedNodeWithPathArgv = buildParseArgv({
      programName: "hex",
      rawArgs: ["/usr/bin/node-22.2.0", "hex", "status"],
    });
    expect(versionedNodeWithPathArgv).toEqual(["/usr/bin/node-22.2.0", "hex", "status"]);

    const nodejsArgv = buildParseArgv({
      programName: "hex",
      rawArgs: ["nodejs", "hex", "status"],
    });
    expect(nodejsArgv).toEqual(["nodejs", "hex", "status"]);

    const nonVersionedNodeArgv = buildParseArgv({
      programName: "hex",
      rawArgs: ["node-dev", "hex", "status"],
    });
    expect(nonVersionedNodeArgv).toEqual(["node", "hex", "node-dev", "hex", "status"]);

    const directArgv = buildParseArgv({
      programName: "hex",
      rawArgs: ["hex", "status"],
    });
    expect(directArgv).toEqual(["node", "hex", "status"]);

    const bunArgv = buildParseArgv({
      programName: "hex",
      rawArgs: ["bun", "src/entry.ts", "status"],
    });
    expect(bunArgv).toEqual(["bun", "src/entry.ts", "status"]);
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "hex",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "hex", "status"]);
  });

  it("decides when to migrate state", () => {
    expect(shouldMigrateState(["node", "hex", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "hex", "health"])).toBe(false);
    expect(shouldMigrateState(["node", "hex", "sessions"])).toBe(false);
    expect(shouldMigrateState(["node", "hex", "memory", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "hex", "agent", "--message", "hi"])).toBe(false);
    expect(shouldMigrateState(["node", "hex", "agents", "list"])).toBe(true);
    expect(shouldMigrateState(["node", "hex", "message", "send"])).toBe(true);
  });

  it("reuses command path for migrate state decisions", () => {
    expect(shouldMigrateStateFromPath(["status"])).toBe(false);
    expect(shouldMigrateStateFromPath(["agents", "list"])).toBe(true);
  });
});
