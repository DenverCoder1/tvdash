"use strict";

const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
    testDir: "./tests",
    testMatch: "compatibility.spec.js",
    workers: 1,
    reporter: "line",
    use: {
        browserName: "chromium",
        baseURL: "http://127.0.0.1:18755",
    },
    webServer: {
        command: "python3 -m http.server 18755 --bind 127.0.0.1",
        url: "http://127.0.0.1:18755/tests/browser-compatibility.html",
        timeout: 10000,
    },
});
