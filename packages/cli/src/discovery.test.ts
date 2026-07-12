import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { displayPath, inputRequiresBatch, resolveBatchInputs } from "./discovery.js";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("input discovery", () => {
  it("distinguishes explicit files from discovered files", async () => {
    const root = await createTree();
    const explicit = join(root, "a.json");
    const result = await resolveBatchInputs([root, explicit]);
    expect(result.errors).toEqual([]);
    expect(result.files.find((item) => item.filePath === explicit)?.origin).toBe("explicit");
    expect(result.files.map((item) => item.filePath)).toEqual([...result.files.map((item) => item.filePath)].sort());
  });

  it("ignores dependency and build directories during discovery", async () => {
    const root = await createTree();
    const result = await resolveBatchInputs([root]);
    expect(result.files.map((item) => item.filePath)).toEqual([join(root, "a.json"), join(root, "nested", "b.json")]);
  });

  it("honors an explicitly named file inside an ignored directory", async () => {
    const root = await createTree();
    const explicit = join(root, "node_modules", "ignored.json");
    const result = await resolveBatchInputs([explicit]);
    expect(result.files).toEqual([{ filePath: explicit, origin: "explicit" }]);
  });

  it("resolves globs deterministically and reports empty matches", async () => {
    const root = await createTree();
    const result = await resolveBatchInputs([`${root.replace(/\\/g, "/")}/**/*.json`]);
    expect(result.files.map((item) => item.filePath)).toEqual([join(root, "a.json"), join(root, "nested", "b.json")]);
    expect(result.files.every((item) => item.origin === "discovered")).toBe(true);

    const empty = await resolveBatchInputs([`${root.replace(/\\/g, "/")}/missing/*.json`]);
    expect(empty.errors[0]?.error).toBe("No files matched input.");
  });

  it("detects batch inputs and normalizes display paths", async () => {
    const root = await createTree();
    expect(await inputRequiresBatch(root)).toBe(true);
    expect(await inputRequiresBatch(join(root, "a.json"))).toBe(false);
    expect(await inputRequiresBatch("*.json")).toBe(true);
    expect(displayPath(join(process.cwd(), "examples", "passing-workflow.json"))).toBe(
      "examples/passing-workflow.json"
    );
  });
});

async function createTree(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "n8n-lint-discovery-"));
  tempRoots.push(root);
  await mkdir(join(root, "nested"));
  await mkdir(join(root, "node_modules"));
  await mkdir(join(root, "dist"));
  await writeFile(join(root, "a.json"), "{}\n");
  await writeFile(join(root, "nested", "b.json"), "{}\n");
  await writeFile(join(root, "node_modules", "ignored.json"), "{}\n");
  await writeFile(join(root, "dist", "ignored.json"), "{}\n");
  await writeFile(join(root, "notes.txt"), "ignored\n");
  return root;
}
