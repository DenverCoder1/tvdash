"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const check = process.argv[2] === "--check";
if (process.argv.length > 3 || (process.argv.length === 3 && !check)) {
    throw new Error("Usage: node scripts/version-assets.js [--check]");
}

const root = path.join(__dirname, "../..");
const indexPath = path.join(root, "index.html");
const original = fs.readFileSync(indexPath, "utf8");
let updated = original;

for (const asset of ["assets/styles.css", "assets/app.js"]) {
    const hash = crypto.createHash("sha256").update(fs.readFileSync(path.join(root, asset))).digest("hex").slice(0, 16);
    const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    const reference = new RegExp(String.raw`(["'])${escaped}(?:\?v=[a-f0-9]+)?\1`, "g");
    if (Array.from(updated.matchAll(reference)).length !== 1) {
        throw new Error(`Expected exactly one versionable reference to ${asset} in index.html`);
    }
    updated = updated.replace(reference, `$1${asset}?v=${hash}$1`);
}

if (updated !== original) {
    if (check) {
        console.error("Asset versions are out of date. Run node scripts/version-assets.js.");
        process.exitCode = 1;
    } else {
        fs.writeFileSync(indexPath, updated);
        console.log("Updated asset versions in index.html.");
    }
}
