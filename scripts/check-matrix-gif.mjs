#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const writeMode = process.argv.includes("--write");
const assetPath = "docs/assets/matrix-compatibility-demo.gif";
const fixturePath = "examples/matrix-2-30-parameter-workflow.json";
const textCommand = ["packages/cli/dist/bin.js", "check", fixturePath, "--n8n-version=matrix"];
const jsonCommand = ["packages/cli/dist/bin.js", "check", fixturePath, "--n8n-version=matrix", "--json"];
const failures = [];

async function main() {
  const textRun = runCommand(textCommand);
  const jsonRun = runCommand(jsonCommand);
  const matrix = parseJson(jsonRun.output);

  expect(textRun.status === 1, "matrix text command must fail when one pinned version fails");
  expect(jsonRun.status === 1, "matrix JSON command must fail when one pinned version fails");
  expect(textRun.output.includes("MATRIX n8n-nodes-base@2.29.6: FAIL"), "matrix output must show 2.29.6 failing");
  expect(textRun.output.includes("MATRIX n8n-nodes-base@2.30.0: PASS"), "matrix output must show 2.30.0 passing");
  expect(
    textRun.output.includes("DIFF examples/matrix-2-30-parameter-workflow.json: 2.29.6=failed, 2.30.0=passed"),
    "matrix output must include the compatibility diff"
  );

  const oldVersion = getVersion(matrix, "2.29.6");
  const newVersion = getVersion(matrix, "2.30.0");
  const difference = Array.isArray(matrix.differences) ? matrix.differences[0] : undefined;

  expect(matrix.ok === false, "matrix JSON must report overall failure for mixed pass/fail matrix");
  expect(oldVersion?.ok === false, "2.29.6 result must fail");
  expect(newVersion?.ok === true, "2.30.0 result must pass");
  expect(difference?.filePath === fixturePath, "matrix difference must reference the checked fixture");
  expect(difference?.statusByVersion?.["2.29.6"] === "failed", "matrix diff must mark 2.29.6 failed");
  expect(difference?.statusByVersion?.["2.30.0"] === "passed", "matrix diff must mark 2.30.0 passed");
  expect(
    difference?.errorSignaturesByVersion?.["2.29.6"]?.includes(
      "workflow.node_parameter_unknown:$.nodes[0].parameters.clearWarning"
    ),
    "matrix diff must include the clearWarning parameter signature"
  );

  if (failures.length > 0) {
    throw new Error(`matrix GIF check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  }

  const expectedGif = renderGif();

  if (writeMode) {
    await mkdir(path.dirname(assetPath), { recursive: true });
    await writeFile(assetPath, expectedGif);
  } else {
    const actualGif = await readFile(assetPath);
    if (!actualGif.equals(expectedGif)) {
      throw new Error(`matrix GIF asset is stale. Run npm run generate:matrix-gif and commit ${assetPath}.`);
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        asset: assetPath,
        commands: [`node ${textCommand.join(" ")}`, `node ${jsonCommand.join(" ")}`],
        checked: [
          "real matrix CLI command",
          "real matrix JSON command",
          "2.29.6 fail and 2.30.0 pass",
          "clearWarning compatibility difference",
          "deterministic animated GIF asset"
        ]
      },
      null,
      2
    )
  );
}

function runCommand(command) {
  const result = spawnSync(process.execPath, command, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      FORCE_COLOR: undefined,
      NO_COLOR: "1"
    }
  });

  return {
    status: result.status,
    output: normalizeLines([result.stdout, result.stderr].filter(Boolean).join("\n"))
  };
}

function parseJson(output) {
  try {
    return JSON.parse(output);
  } catch (error) {
    failures.push(`matrix JSON output must parse: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}

function getVersion(value, packageVersion) {
  return Array.isArray(value.versions)
    ? value.versions.find((entry) => entry?.packageVersion === packageVersion)
    : undefined;
}

function renderGif() {
  const width = 640;
  const height = 360;
  const stages = [0, 1, 2, 3, 4];
  const delays = [70, 85, 85, 85, 150];
  const frames = stages.map((stage) => renderFrame(width, height, stage));
  return encodeGif(width, height, frames, delays);
}

function renderFrame(width, height, stage) {
  const pixels = new Uint8Array(width * height).fill(COLORS.background);

  rect(pixels, width, 0, 0, width, height, COLORS.background);
  rect(pixels, width, 24, 92, 592, 210, COLORS.terminal);
  rect(pixels, width, 24, 92, 592, 2, COLORS.border);
  rect(pixels, width, 24, 300, 592, 2, COLORS.border);
  rect(pixels, width, 24, 92, 2, 210, COLORS.border);
  rect(pixels, width, 614, 92, 2, 210, COLORS.border);

  drawText(pixels, width, 30, 26, "N8N-LINT MATRIX GIF", COLORS.dark, 3);
  drawText(pixels, width, 32, 64, "GENERATED FROM REAL CLI OUTPUT", COLORS.gray, 2);
  drawText(pixels, width, 46, 120, "$ CHECK --N8N-VERSION=MATRIX", COLORS.cyan, 2);

  drawText(pixels, width, 46, 156, "MATRIX 2.29.6 FAIL", stage >= 1 ? COLORS.red : COLORS.dim, 3);
  drawText(pixels, width, 46, 206, "MATRIX 2.30.0 PASS", stage >= 2 ? COLORS.green : COLORS.dim, 3);
  drawText(pixels, width, 46, 258, "DIFF CLEARWARNING", stage >= 3 ? COLORS.yellow : COLORS.dim, 2);
  drawText(pixels, width, 270, 258, "2.29.6=FAILED", stage >= 4 ? COLORS.yellow : COLORS.dim, 2);
  drawText(pixels, width, 444, 258, "2.30.0=PASSED", stage >= 4 ? COLORS.yellow : COLORS.dim, 2);

  rect(pixels, width, 24, 316, 592, 2, COLORS.border);
  drawText(pixels, width, 30, 330, "PROOF: BUILT CLI AND JSON MATRIX OUTPUT", COLORS.gray, 2);

  return pixels;
}

function rect(pixels, width, x, y, w, h, color) {
  for (let row = Math.max(0, y); row < Math.min(y + h, pixels.length / width); row += 1) {
    for (let col = Math.max(0, x); col < Math.min(x + w, width); col += 1) {
      pixels[row * width + col] = color;
    }
  }
}

function drawText(pixels, width, x, y, text, color, scale) {
  let cursorX = x;
  for (const rawChar of text.toUpperCase()) {
    const pattern = FONT[rawChar] ?? FONT["?"];
    for (let row = 0; row < pattern.length; row += 1) {
      for (let col = 0; col < pattern[row].length; col += 1) {
        if (pattern[row][col] !== "#") {
          continue;
        }

        rect(pixels, width, cursorX + col * scale, y + row * scale, scale, scale, color);
      }
    }

    cursorX += 6 * scale;
  }
}

function encodeGif(width, height, frames, delays) {
  const bytes = [];
  pushAscii(bytes, "GIF89a");
  pushWord(bytes, width);
  pushWord(bytes, height);
  bytes.push(0xf3, COLORS.background, 0);
  for (const [red, green, blue] of PALETTE) {
    bytes.push(red, green, blue);
  }

  pushAscii(bytes, "\x21\xff\x0bNETSCAPE2.0\x03\x01");
  pushWord(bytes, 0);
  bytes.push(0);

  for (let index = 0; index < frames.length; index += 1) {
    bytes.push(0x21, 0xf9, 0x04, 0x00);
    pushWord(bytes, delays[index]);
    bytes.push(0x00, 0x00);
    bytes.push(0x2c);
    pushWord(bytes, 0);
    pushWord(bytes, 0);
    pushWord(bytes, width);
    pushWord(bytes, height);
    bytes.push(0x00);
    bytes.push(4);
    pushSubBlocks(bytes, lzwEncode(frames[index], 4));
  }

  bytes.push(0x3b);
  return Buffer.from(bytes);
}

function lzwEncode(indices, minCodeSize) {
  const resetCodeLimit = 30;
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  const output = [];
  let dictionary = createDictionary(clearCode);
  let nextCode = endCode + 1;
  let codeSize = minCodeSize + 1;
  let bitBuffer = 0;
  let bitLength = 0;

  const writeCode = (code) => {
    bitBuffer |= code << bitLength;
    bitLength += codeSize;
    while (bitLength >= 8) {
      output.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitLength -= 8;
    }
  };

  const reset = () => {
    dictionary = createDictionary(clearCode);
    nextCode = endCode + 1;
    codeSize = minCodeSize + 1;
  };

  writeCode(clearCode);
  let current = codeKey(indices[0]);

  for (let index = 1; index < indices.length; index += 1) {
    const next = codeKey(indices[index]);
    const combined = `${current},${next}`;
    if (dictionary.has(combined)) {
      current = combined;
      continue;
    }

    writeCode(dictionary.get(current));
    if (nextCode >= resetCodeLimit) {
      writeCode(clearCode);
      reset();
      current = next;
      continue;
    }

    if (nextCode < 4096) {
      dictionary.set(combined, nextCode);
      nextCode += 1;
      if (nextCode === 1 << codeSize && codeSize < 12) {
        codeSize += 1;
      }
    } else {
      writeCode(clearCode);
      reset();
    }
    current = next;
  }

  writeCode(dictionary.get(current));
  writeCode(endCode);

  if (bitLength > 0) {
    output.push(bitBuffer & 0xff);
  }

  return output;
}

function createDictionary(colorCount) {
  const dictionary = new Map();
  for (let index = 0; index < colorCount; index += 1) {
    dictionary.set(codeKey(index), index);
  }
  return dictionary;
}

function codeKey(index) {
  return String(index);
}

function pushSubBlocks(bytes, data) {
  for (let offset = 0; offset < data.length; offset += 255) {
    const chunk = data.slice(offset, offset + 255);
    bytes.push(chunk.length);
    for (const value of chunk) {
      bytes.push(value);
    }
  }
  bytes.push(0);
}

function pushWord(bytes, value) {
  bytes.push(value & 0xff, (value >> 8) & 0xff);
}

function pushAscii(bytes, text) {
  for (let index = 0; index < text.length; index += 1) {
    bytes.push(text.charCodeAt(index));
  }
}

function normalizeLines(text) {
  return text.replace(/\r\n/g, "\n").trimEnd();
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

const COLORS = {
  background: 0,
  dark: 1,
  gray: 2,
  border: 3,
  terminal: 4,
  dim: 5,
  cyan: 6,
  red: 7,
  green: 8,
  yellow: 9
};

const PALETTE = [
  [248, 250, 252],
  [15, 23, 42],
  [100, 116, 139],
  [203, 213, 225],
  [15, 23, 42],
  [71, 85, 105],
  [103, 232, 249],
  [248, 113, 113],
  [134, 239, 172],
  [253, 230, 138],
  [255, 255, 255],
  [37, 99, 235],
  [239, 68, 68],
  [34, 197, 94],
  [234, 179, 8],
  [226, 232, 240]
];

const FONT = {
  " ": ["     ", "     ", "     ", "     ", "     ", "     ", "     "],
  "-": ["     ", "     ", "     ", "#####", "     ", "     ", "     "],
  ".": ["     ", "     ", "     ", "     ", "     ", " ##  ", " ##  "],
  ":": ["     ", " ##  ", " ##  ", "     ", " ##  ", " ##  ", "     "],
  $: [" ### ", "# # #", "#    ", " ### ", "    #", "# # #", " ### "],
  "=": ["     ", "#####", "     ", "#####", "     ", "     ", "     "],
  "?": [" ### ", "#   #", "    #", "  ## ", "  #  ", "     ", "  #  "],
  0: [" ### ", "#   #", "#  ##", "# # #", "##  #", "#   #", " ### "],
  1: ["  #  ", " ##  ", "# #  ", "  #  ", "  #  ", "  #  ", "#####"],
  2: [" ### ", "#   #", "    #", "   # ", "  #  ", " #   ", "#####"],
  3: [" ### ", "#   #", "    #", "  ## ", "    #", "#   #", " ### "],
  4: ["   # ", "  ## ", " # # ", "#  # ", "#####", "   # ", "   # "],
  5: ["#####", "#    ", "#    ", "#### ", "    #", "#   #", " ### "],
  6: [" ### ", "#   #", "#    ", "#### ", "#   #", "#   #", " ### "],
  7: ["#####", "    #", "   # ", "  #  ", " #   ", " #   ", " #   "],
  8: [" ### ", "#   #", "#   #", " ### ", "#   #", "#   #", " ### "],
  9: [" ### ", "#   #", "#   #", " ####", "    #", "#   #", " ### "],
  A: [" ### ", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
  B: ["#### ", "#   #", "#   #", "#### ", "#   #", "#   #", "#### "],
  C: [" ### ", "#   #", "#    ", "#    ", "#    ", "#   #", " ### "],
  D: ["#### ", "#   #", "#   #", "#   #", "#   #", "#   #", "#### "],
  E: ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#####"],
  F: ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#    "],
  G: [" ### ", "#   #", "#    ", "#  ##", "#   #", "#   #", " ####"],
  H: ["#   #", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
  I: ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "#####"],
  J: ["#####", "   # ", "   # ", "   # ", "   # ", "#  # ", " ##  "],
  K: ["#   #", "#  # ", "# #  ", "##   ", "# #  ", "#  # ", "#   #"],
  L: ["#    ", "#    ", "#    ", "#    ", "#    ", "#    ", "#####"],
  M: ["#   #", "## ##", "# # #", "#   #", "#   #", "#   #", "#   #"],
  N: ["#   #", "##  #", "# # #", "#  ##", "#   #", "#   #", "#   #"],
  O: [" ### ", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  P: ["#### ", "#   #", "#   #", "#### ", "#    ", "#    ", "#    "],
  Q: [" ### ", "#   #", "#   #", "#   #", "# # #", "#  # ", " ## #"],
  R: ["#### ", "#   #", "#   #", "#### ", "# #  ", "#  # ", "#   #"],
  S: [" ####", "#    ", "#    ", " ### ", "    #", "    #", "#### "],
  T: ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  "],
  U: ["#   #", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  V: ["#   #", "#   #", "#   #", "#   #", "#   #", " # # ", "  #  "],
  W: ["#   #", "#   #", "#   #", "# # #", "# # #", "## ##", "#   #"],
  X: ["#   #", "#   #", " # # ", "  #  ", " # # ", "#   #", "#   #"],
  Y: ["#   #", "#   #", " # # ", "  #  ", "  #  ", "  #  ", "  #  "],
  Z: ["#####", "    #", "   # ", "  #  ", " #   ", "#    ", "#####"]
};

await main();
