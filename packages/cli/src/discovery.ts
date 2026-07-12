import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export type InputOrigin = "explicit" | "discovered";

export interface ResolvedBatchFile {
  filePath: string;
  origin: InputOrigin;
}

export interface ResolvedBatchInputs {
  files: ResolvedBatchFile[];
  errors: Array<{ filePath: string; error: string }>;
}

const ignoredDirectoryNames = new Set([
  ".git",
  ".cache",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target"
]);

export async function inputRequiresBatch(input: string): Promise<boolean> {
  if (hasGlobCharacters(input)) return true;
  try {
    return (await stat(input)).isDirectory();
  } catch {
    return false;
  }
}

export async function resolveBatchInputs(inputs: string[]): Promise<ResolvedBatchInputs> {
  const files = new Map<string, InputOrigin>();
  const errors: ResolvedBatchInputs["errors"] = [];

  for (const input of inputs) {
    try {
      const result = hasGlobCharacters(input)
        ? { origin: "discovered" as const, files: await resolveGlobInput(input) }
        : await resolveFileOrDirectoryInput(input);

      if (result.files.length === 0) {
        errors.push({ filePath: input, error: "No files matched input." });
        continue;
      }

      for (const file of result.files) {
        const absolute = path.resolve(file);
        const existing = files.get(absolute);
        files.set(absolute, existing === "explicit" || result.origin === "explicit" ? "explicit" : "discovered");
      }
    } catch (error) {
      errors.push({ filePath: input, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return {
    files: [...files.entries()]
      .map(([filePath, origin]) => ({ filePath, origin }))
      .sort((left, right) => displayPath(left.filePath).localeCompare(displayPath(right.filePath))),
    errors
  };
}

async function resolveFileOrDirectoryInput(input: string): Promise<{ files: string[]; origin: InputOrigin }> {
  const inputStat = await stat(input);
  if (inputStat.isDirectory()) return { files: await collectJsonFiles(input), origin: "discovered" };
  if (inputStat.isFile()) return { files: [input], origin: "explicit" };
  return { files: [], origin: "explicit" };
}

async function resolveGlobInput(pattern: string): Promise<string[]> {
  const baseDirectory = getGlobBase(pattern);
  let candidates: string[];
  try {
    candidates = await collectFiles(baseDirectory);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return [];
    throw error;
  }
  const matcher = globToRegExp(normalizePathForMatch(pattern));
  const isAbsolutePattern = path.isAbsolute(pattern);
  return candidates.filter((candidate) => {
    const value = normalizePathForMatch(
      isAbsolutePattern ? path.resolve(candidate) : path.relative(process.cwd(), candidate)
    );
    return matcher.test(value);
  });
}

async function collectJsonFiles(directory: string): Promise<string[]> {
  return (await collectFiles(directory)).filter((file) => file.toLowerCase().endsWith(".json"));
}

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(entryPath)));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

function getGlobBase(pattern: string): string {
  const normalized = normalizePathForMatch(pattern);
  const wildcardIndex = normalized.search(/[*?]/);
  if (wildcardIndex === -1) return path.dirname(pattern);
  const fixedPrefix = normalized.slice(0, wildcardIndex);
  const lastSlash = fixedPrefix.lastIndexOf("/");
  if (lastSlash === -1) return ".";
  const base = fixedPrefix.slice(0, lastSlash);
  return base === "" ? path.parse(process.cwd()).root : path.normalize(base);
}

function globToRegExp(pattern: string): RegExp {
  let regex = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index] as string;
    const next = pattern[index + 1];
    if (char === "*") {
      if (next === "*") {
        const afterNext = pattern[index + 2];
        regex += afterNext === "/" ? "(?:.*/)?" : ".*";
        index += afterNext === "/" ? 2 : 1;
      } else regex += "[^/]*";
    } else if (char === "?") regex += "[^/]";
    else regex += escapeRegExp(char);
  }
  return new RegExp(`${regex}$`);
}

export function hasGlobCharacters(input: string): boolean {
  return /[*?]/.test(input);
}

export function normalizePathForMatch(value: string): string {
  return value.replace(/\\/g, "/");
}

export function displayPath(filePath: string): string {
  return normalizePathForMatch(path.relative(process.cwd(), path.resolve(filePath)));
}

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$+?.()|[\]{}]/g, "\\$&");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
