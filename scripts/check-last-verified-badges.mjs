#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

const shouldWrite = process.argv.includes("--write");
const assetPath = "docs/assets/last-verified-badges.svg";

const states = [
  {
    title: "Fresh verification",
    caption: "Green: recently checked",
    fixture: "examples/badge-last-verified-green.json",
    expected: "verified 2 days ago",
    color: "#16a34a"
  },
  {
    title: "Recheck recommended",
    caption: "Yellow: proof is aging",
    fixture: "examples/badge-last-verified-yellow.json",
    expected: "verified 45 days ago - recheck recommended",
    color: "#ca8a04"
  },
  {
    title: "Stale verification",
    caption: "Red: no longer launch-safe",
    fixture: "examples/badge-last-verified-red.json",
    expected: "verified 120 days ago - stale, unverified",
    color: "#dc2626"
  }
];

const renderedStates = states.map((state) => {
  const svg = execFileSync(
    process.execPath,
    [
      "packages/cli/dist/bin.js",
      "badge",
      state.fixture,
      "--kind",
      "last-verified",
      "--as-of",
      "2026-07-08",
      "--format",
      "svg"
    ],
    { encoding: "utf8" }
  ).trim();

  expect(svg.includes(state.expected), `${state.fixture} badge must include ${state.expected}`);
  return {
    ...state,
    svg,
    width: readSvgWidth(svg)
  };
});

const expected = renderAsset(renderedStates);

if (shouldWrite) {
  await writeFile(assetPath, `${expected}\n`, "utf8");
} else {
  const actual = await readFile(assetPath, "utf8");
  if (actual.trimEnd() !== expected) {
    throw new Error(
      `last-verified badge asset is stale. Run npm run generate:last-verified-badges and commit ${assetPath}.`
    );
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      asset: assetPath,
      sources: renderedStates.map((state) => state.fixture),
      checked: [
        "green recent badge",
        "yellow recheck-recommended badge",
        "red stale badge",
        "asset generated from real CLI badge SVG output"
      ]
    },
    null,
    2
  )
);

function renderAsset(items) {
  const width = 1080;
  const rowHeight = 136;
  const height = 150 + items.length * rowHeight;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`,
    `<title id="title">n8n-lint last-verified badge states</title>`,
    `<desc id="desc">Generated green, yellow, and red last-verified badge states from n8n-lint badge command output.</desc>`,
    `<rect width="${width}" height="${height}" fill="#f8fafc"/>`,
    `<rect x="28" y="28" width="${width - 56}" height="${height - 56}" rx="8" fill="#ffffff" stroke="#cbd5e1"/>`,
    `<text x="54" y="72" fill="#0f172a" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="30" font-weight="700">Last-verified badge decay</text>`,
    `<text x="54" y="106" fill="#475569" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="16">Each badge below is rendered by the built CLI from checked JSON proof fixtures.</text>`,
    ...items.flatMap((item, index) => renderRow(item, index, 54, 142 + index * rowHeight)),
    `</svg>`
  ].join("");
}

function renderRow(item, index, x, y) {
  return [
    `<rect x="${x}" y="${y}" width="972" height="104" rx="6" fill="#ffffff" stroke="#e2e8f0"/>`,
    `<rect x="${x}" y="${y}" width="6" height="104" rx="3" fill="${item.color}"/>`,
    `<text x="${x + 28}" y="${y + 34}" fill="#0f172a" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="18" font-weight="700">${escapeXml(item.title)}</text>`,
    `<text x="${x + 28}" y="${y + 60}" fill="#64748b" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="14">${escapeXml(item.caption)}</text>`,
    `<g transform="translate(${x + 302} ${y + 39})">${stripSvgWrapper(item.svg, index)}</g>`,
    `<text x="${x + 302}" y="${y + 84}" fill="#475569" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="13">${escapeXml(item.expected)}</text>`
  ];
}

function stripSvgWrapper(svg, index) {
  const gradientId = `lastVerifiedGradient${index}`;
  const clipId = `lastVerifiedClip${index}`;
  const body = svg
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>$/, "")
    .replace(/\sid="s"/g, ` id="${gradientId}"`)
    .replaceAll("url(#s)", `url(#${gradientId})`)
    .replace(/\sid="r"/g, ` id="${clipId}"`)
    .replaceAll("url(#r)", `url(#${clipId})`);
  return `<svg width="${readSvgWidth(svg)}" height="20" viewBox="0 0 ${readSvgWidth(svg)} 20">${body}</svg>`;
}

function readSvgWidth(svg) {
  const match = /width="(\d+)"/.exec(svg);
  if (match === null) {
    throw new Error("Badge SVG output must include an integer width.");
  }

  return Number.parseInt(match[1], 10);
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
