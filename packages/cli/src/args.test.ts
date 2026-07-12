import { describe, expect, it } from "vitest";
import { parseArgs } from "./args.js";

describe("parseArgs", () => {
  it("parses the check defaults", () => {
    const parsed = parseArgs(["check", "workflow.json"]);
    expect(parsed).toMatchObject({
      command: "check",
      inputs: ["workflow.json"],
      source: "bundled-n8n-package",
      n8nVersion: "2.29.6",
      json: false
    });
  });

  it("parses check options before and after the command", () => {
    expect(parseArgs(["--json", "check", "one.json", "--n8n-version=matrix"]).json).toBe(true);
    expect(parseArgs(["check", "one.json", "--source", "local-placeholder"]).source).toBe("local-placeholder");
    expect(parseArgs(["--version"]).version).toBe(true);
    expect(parseArgs(["-h"]).help).toBe(true);
  });

  it("parses repair and badge options", () => {
    expect(parseArgs(["repair", "one.json", "--apply", "--confirm", "--output", "fix.patch"])).toMatchObject({
      apply: true,
      confirm: true,
      outputPath: "fix.patch"
    });
    expect(
      parseArgs([
        "badge",
        "result.json",
        "--kind=last-verified",
        "--as-of",
        "2026-07-11",
        "--label",
        "proof",
        "--format=svg"
      ])
    ).toMatchObject({
      badgeKind: "last-verified",
      asOfDate: "2026-07-11",
      label: "proof",
      format: "svg"
    });
  });

  it.each([
    [["check", "one.json", "--apply"], "check does not support --apply"],
    [["check", "one.json", "--label", "ignored"], "check does not support --label"],
    [["repair", "one.json", "--kind", "status"], "repair does not support --kind"],
    [["badge", "result.json", "--source", "local-placeholder"], "badge does not support --source"],
    [["badge", "result.json", "--confirm"], "badge does not support --confirm"]
  ])("rejects command-specific option misuse", (args, message) => {
    expect(() => parseArgs(args)).toThrow(message);
  });

  it.each([
    [["check", "one.json", "--wat"], "Unexpected option"],
    [["check", "one.json", "--source", "remote"], "--source must be"],
    [["check", "one.json", "--n8n-version", "1.0.0"], "--n8n-version must be"],
    [["badge", "result.json", "--format", "html"], "--format must be"],
    [["badge", "result.json", "--kind", "old"], "--kind must be"],
    [["badge", "result.json", "--output="], "--output requires"],
    [["badge", "result.json", "--label", ""], "--label requires"],
    [["badge", "result.json", "--as-of"], "--as-of requires a value"]
  ])("rejects invalid values", (args, message) => {
    expect(() => parseArgs(args)).toThrow(message);
  });
});
