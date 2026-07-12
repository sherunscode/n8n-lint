import { readdir, stat } from "node:fs/promises";
import path from "node:path";
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
export async function inputRequiresBatch(input) {
    if (hasGlobCharacters(input))
        return true;
    try {
        return (await stat(input)).isDirectory();
    }
    catch {
        return false;
    }
}
export async function resolveBatchInputs(inputs) {
    const files = new Map();
    const errors = [];
    for (const input of inputs) {
        try {
            const result = hasGlobCharacters(input)
                ? { origin: "discovered", files: await resolveGlobInput(input) }
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
        }
        catch (error) {
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
async function resolveFileOrDirectoryInput(input) {
    const inputStat = await stat(input);
    if (inputStat.isDirectory())
        return { files: await collectJsonFiles(input), origin: "discovered" };
    if (inputStat.isFile())
        return { files: [input], origin: "explicit" };
    return { files: [], origin: "explicit" };
}
async function resolveGlobInput(pattern) {
    const baseDirectory = getGlobBase(pattern);
    let candidates;
    try {
        candidates = await collectFiles(baseDirectory);
    }
    catch (error) {
        if (isNodeError(error) && error.code === "ENOENT")
            return [];
        throw error;
    }
    const matcher = globToRegExp(normalizePathForMatch(pattern));
    const isAbsolutePattern = path.isAbsolute(pattern);
    return candidates.filter((candidate) => {
        const value = normalizePathForMatch(isAbsolutePattern ? path.resolve(candidate) : path.relative(process.cwd(), candidate));
        return matcher.test(value);
    });
}
async function collectJsonFiles(directory) {
    return (await collectFiles(directory)).filter((file) => file.toLowerCase().endsWith(".json"));
}
async function collectFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
        if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name))
            continue;
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory())
            files.push(...(await collectFiles(entryPath)));
        else if (entry.isFile())
            files.push(entryPath);
    }
    return files;
}
function getGlobBase(pattern) {
    const normalized = normalizePathForMatch(pattern);
    const wildcardIndex = normalized.search(/[*?]/);
    if (wildcardIndex === -1)
        return path.dirname(pattern);
    const fixedPrefix = normalized.slice(0, wildcardIndex);
    const lastSlash = fixedPrefix.lastIndexOf("/");
    if (lastSlash === -1)
        return ".";
    const base = fixedPrefix.slice(0, lastSlash);
    return base === "" ? path.parse(process.cwd()).root : path.normalize(base);
}
function globToRegExp(pattern) {
    let regex = "^";
    for (let index = 0; index < pattern.length; index += 1) {
        const char = pattern[index];
        const next = pattern[index + 1];
        if (char === "*") {
            if (next === "*") {
                const afterNext = pattern[index + 2];
                regex += afterNext === "/" ? "(?:.*/)?" : ".*";
                index += afterNext === "/" ? 2 : 1;
            }
            else
                regex += "[^/]*";
        }
        else if (char === "?")
            regex += "[^/]";
        else
            regex += escapeRegExp(char);
    }
    return new RegExp(`${regex}$`);
}
export function hasGlobCharacters(input) {
    return /[*?]/.test(input);
}
export function normalizePathForMatch(value) {
    return value.replace(/\\/g, "/");
}
export function displayPath(filePath) {
    return normalizePathForMatch(path.relative(process.cwd(), path.resolve(filePath)));
}
function escapeRegExp(value) {
    return value.replace(/[\\^$+?.()|[\]{}]/g, "\\$&");
}
function isNodeError(error) {
    return error instanceof Error && "code" in error;
}
//# sourceMappingURL=discovery.js.map