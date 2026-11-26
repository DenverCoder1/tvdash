"use strict";

const fs = require("node:fs");
const path = require("node:path");
const acorn = require("acorn");
const { test, expect } = require("@playwright/test");

const root = path.join(__dirname, "..");

test("shipped JavaScript parses as ES5", () => {
    const app = fs.readFileSync(path.join(root, "assets/app.js"), "utf8");
    acorn.parse(app, { ecmaVersion: 5, sourceFile: "assets/app.js" });

    const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
    for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
        if (/\bsrc\s*=/i.test(script[1])) continue;
        acorn.parse(script[2], { ecmaVersion: 5, sourceFile: "index.html (inline script)" });
    }
});

test("browser compatibility scenarios pass", async ({ page, baseURL }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
        if (new URL(route.request().url()).origin === baseURL) return route.continue();
        return route.abort();
    });

    await page.goto("/tests/browser-compatibility.html", { waitUntil: "domcontentloaded" });
    const results = page.locator("#results");
    await expect(results).toHaveAttribute("data-status", /^(passed|failed)$/, { timeout: 15000 });
    console.log(await results.textContent());
    await expect(results).toHaveAttribute("data-status", "passed");
    expect(errors).toEqual([]);
});
