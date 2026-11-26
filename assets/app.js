(function () {
    "use strict";

    const STORAGE_KEY = "tvHome.bookmarks";
    const SETTINGS_KEY = "tvHome.settings";
    const MAX_BOOKMARKS = 12; // two rows, so the home screen never needs scrolling
    const MAX_DIGITS = 10;
    const DEFAULT_SETTINGS = {
        accent: "orange",
        darkMode: null,
        hour24: false,
        dateFormat: "long-day-first",
        defaultFocus: "code",
        searchEngines: ["google"],
        searchEngine: "google",
    };
    const DEFAULTS = [
        { title: "YouTube", url: "https://www.youtube.com/" },
        { title: "GitHub", url: "https://github.com/" },
        { title: "Speed Test", url: "https://www.fast.com/" },
        { title: "FMHY", url: "https://fmhy.net/video#streaming-sites" },
    ];
    const SEARCH_ENGINES = {
        google: { name: "Google", icon: "google-color.svg", url: "https://www.google.com/search?q=" },
        duckduckgo: { name: "DuckDuckGo", icon: "duckduckgo-color.svg", url: "https://duckduckgo.com/?q=" },
        brave: { name: "Brave", icon: "brave-color.svg", url: "https://search.brave.com/search?q=" },
        qwant: { name: "Qwant", icon: "qwant-color.svg", url: "https://www.qwant.com/?q=" },
        bing: { name: "Bing", icon: "bing-color.svg", url: "https://www.bing.com/search?q=" },
        startpage: {
            name: "Startpage",
            icon: "startpage-color.svg",
            url: "https://www.startpage.com/sp/search?query=",
        },
        ecosia: { name: "Ecosia", icon: "ecosia-color.svg", url: "https://www.ecosia.org/search?q=" },
    };
    const DATE_FORMATS = {
        "long-day-first": {
            preview: "datePreviewDayFirst",
            locale: "en-GB",
            options: { weekday: "long", day: "numeric", month: "long" },
        },
        "long-month-first": {
            preview: "datePreviewMonthFirst",
            locale: "en-US",
            options: { weekday: "long", day: "numeric", month: "long" },
        },
        "year-first": { preview: "datePreviewYearFirst" },
    };

    function $(id) {
        return document.getElementById(id);
    }

    /* ---------- Settings ---------- */
    function loadSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
            if (saved && typeof saved === "object") {
                const loaded = { ...DEFAULT_SETTINGS, ...saved };
                delete loaded.reduceMotion;
                if (loaded.dateFormat === "long" || loaded.dateFormat === "day-first") {
                    loaded.dateFormat = "long-day-first";
                } else if (loaded.dateFormat === "month-first") {
                    loaded.dateFormat = "long-month-first";
                }
                if (!Object.hasOwn(DATE_FORMATS, loaded.dateFormat)) {
                    console.warn("Unrecognized saved date format. Using the full date.");
                    loaded.dateFormat = DEFAULT_SETTINGS.dateFormat;
                }
                if (loaded.defaultFocus !== "code" && loaded.defaultFocus !== "search") {
                    console.warn("Unrecognized saved default focus. Using the downloader code box.");
                    loaded.defaultFocus = DEFAULT_SETTINGS.defaultFocus;
                }
                if (!Array.isArray(loaded.searchEngines) || !loaded.searchEngines.length) {
                    loaded.searchEngines = DEFAULT_SETTINGS.searchEngines.slice();
                }
                if (!loaded.searchEngines.includes(loaded.searchEngine)) {
                    loaded.searchEngine = loaded.searchEngines[0];
                }
                return loaded;
            }
        } catch (error) {
            /* storage blocked or damaged: use defaults */
        }
        return { ...DEFAULT_SETTINGS };
    }

    function saveSettings() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            $("settingsMessage").textContent = "";
        } catch (error) {
            $("settingsMessage").textContent =
                "This browser blocked saving. Changes will be lost when the page reloads.";
        }
    }

    const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
    let settings = loadSettings();

    function focusDefaultInput() {
        (settings.defaultFocus === "search" ? $("query") : $("code")).focus();
    }

    function resolvedDarkMode() {
        return settings.darkMode === null ? systemDark.matches : settings.darkMode;
    }

    function applySettings() {
        const dark = resolvedDarkMode();
        const modeName = dark ? "dark" : "light";
        const colorScheme = settings.darkMode === null ? "light dark" : modeName;
        document.documentElement.dataset.accent = settings.accent;
        document.documentElement.dataset.scheme = modeName;
        document.querySelector('meta[name="color-scheme"]').content = colorScheme;
        document.querySelector('meta[name="theme-color"]').content = dark ? "#0E0E10" : "#F2F2F5";

        $("darkMode").checked = dark;
        $("darkModeDescription").textContent =
            settings.darkMode === null ? "Following system: " + modeName : "Manually set to " + modeName;
        $("hour24").checked = Boolean(settings.hour24);
        Array.prototype.forEach.call(document.querySelectorAll('input[name="dateFormat"]'), function (input) {
            input.checked = input.value === settings.dateFormat;
        });
        Array.prototype.forEach.call(document.querySelectorAll('input[name="defaultFocus"]'), function (input) {
            input.checked = input.value === settings.defaultFocus;
        });
        const accentInput = document.querySelector('input[name="accent"][value="' + settings.accent + '"]');
        if (accentInput) accentInput.checked = true;
        Array.prototype.forEach.call(document.querySelectorAll('input[name="searchEngineEnabled"]'), function (input) {
            input.checked = settings.searchEngines.includes(input.value);
        });
        updateSearchEnginePicker();
        tick();
    }

    function resetSettings() {
        settings = { ...DEFAULT_SETTINGS, searchEngines: DEFAULT_SETTINGS.searchEngines.slice(),};
        saveSettings();
        applySettings();
    }

    /* ---------- Clock ---------- */
    function formatDate(now, format) {
        if (format === "year-first") {
            return (
                now.getFullYear() + "-" + ("0" + (now.getMonth() + 1)).slice(-2) + "-" + ("0" + now.getDate()).slice(-2)
            );
        }
        const preset = DATE_FORMATS[format];
        if (format === "long-day-first") {
            return new Intl.DateTimeFormat(preset.locale, preset.options)
                .formatToParts(now)
                .map(function (part) {
                    return part.type === "weekday" ? part.value + "," : part.value;
                })
                .join("");
        }
        return now.toLocaleDateString(preset.locale, preset.options);
    }

    function tick() {
        const now = new Date();
        const time = now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: !settings.hour24,
        });
        const date = formatDate(now, settings.dateFormat);
        if ($("time").textContent !== time) $("time").textContent = time;
        if ($("date").textContent !== date) $("date").textContent = date;
        Object.keys(DATE_FORMATS).forEach(function (format) {
            const preview = $(DATE_FORMATS[format].preview);
            const text = formatDate(now, format);
            if (preview.textContent !== text) preview.textContent = text;
        });
    }
    tick();
    setInterval(tick, 1000);

    /* ---------- Address detection ---------- */
    const LABEL = String.raw`[a-z0-9\u00a1-\uffff](?:[a-z0-9_\-\u00a1-\uffff]*[a-z0-9\u00a1-\uffff])?`;
    const TLD = String.raw`(?:xn--[a-z0-9-]+|[a-z\u00a1-\uffff]{2,})`;
    const REST = String.raw`(?::\d{1,5})?(?:[/?#]\S*)?$`;
    const DOMAIN = new RegExp("^(?:" + LABEL + String.raw`\.)+` + TLD + String.raw`\.?` + REST, "i");
    const OCTET = String.raw`(?:25[0-5]|2[0-4]\d|1?\d?\d)`;
    const LOCAL = new RegExp("^(?:localhost|(?:" + OCTET + String.raw`\.){3}` + OCTET + ")" + REST, "i");

    // Returns a full web address, or null when the text is not one
    function toUrl(text) {
        const value = text.trim();
        let full;
        if (!value || /\s/.test(value)) return null;
        if (/^https?:\/\//i.test(value)) full = value;
        else if (LOCAL.test(value)) full = "http://" + value;
        else if (DOMAIN.test(value)) full = "https://" + value;
        else return null;
        try {
            const url = new URL(full);
            return url.hostname ? url.href : null;
        } catch (error) {
            return null;
        }
    }

    /* ---------- Search bar ---------- */
    const query = $("query");

    function updateSearchEnginePicker() {
        const enabled = settings.searchEngines.filter(function (id) {
            return SEARCH_ENGINES[id];
        });
        const picker = $("searchEnginePicker");
        const select = $("searchEngine");
        const search = $("searchForm");

        select.textContent = "";
        enabled.forEach(function (id) {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = SEARCH_ENGINES[id].name;
            select.appendChild(option);
        });

        if (!enabled.includes(settings.searchEngine)) settings.searchEngine = enabled[0] || "google";
        select.value = settings.searchEngine;
        $("searchEngineIcon").src = "assets/search-icons/" + SEARCH_ENGINES[settings.searchEngine].icon;
        $("searchEngineIcon").alt = "";

        const multiple = enabled.length > 1;
        picker.hidden = !multiple;
        search.classList.toggle("has-engine-picker", multiple);
        const name = SEARCH_ENGINES[settings.searchEngine].name;
        query.placeholder = "Search " + name + " or type a web address";
        query.setAttribute("aria-label", "Search " + name + " or type a web address");
    }

    $("searchEngine").addEventListener("change", function () {
        settings.searchEngine = this.value;
        saveSettings();
        updateSearchEnginePicker();
    });

    query.addEventListener("input", function () {
        $("searchButton").textContent = toUrl(query.value) ? "Open site" : "Search";
    });

    $("searchForm").addEventListener("submit", function (event) {
        event.preventDefault();
        const text = query.value.trim();
        if (!text) return query.focus();
        const url = toUrl(text);
        if (url) {
            window.location.href = url;
        } else {
            const engine = SEARCH_ENGINES[settings.searchEngine] || SEARCH_ENGINES.google;
            window.location.href = engine.url + encodeURIComponent(text);
        }
    });

    /* ---------- Code entry ---------- */
    const code = $("code");

    function updateCode() {
        code.value = code.value.replace(/\D/g, "").slice(0, MAX_DIGITS);
        $("preview").textContent = "aftv.news/" + (code.value || "…");
    }

    code.addEventListener("input", updateCode);

    $("codeForm").addEventListener("submit", function (event) {
        event.preventDefault();
        updateCode();
        if (!code.value) return code.focus();
        $("goButton").textContent = "Opening…";
        window.location.href = "https://aftv.news/" + code.value;
    });

    /* ---------- Bookmark storage ---------- */
    function load() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (Array.isArray(saved)) {
                return saved
                    .filter(function (item) {
                        return (
                            item && typeof item.title === "string" && typeof item.url === "string" && toUrl(item.url)
                        );
                    })
                    .slice(0, MAX_BOOKMARKS);
            }
        } catch (error) {
            /* storage blocked or damaged: use the defaults */
        }
        return DEFAULTS.slice();
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
            $("listMessage").textContent = "";
            return true;
        } catch (error) {
            $("listMessage").textContent = "This browser blocked saving. Changes will be lost when the page reloads.";
            return false;
        }
    }

    let bookmarks = load();

    /* ---------- Rendering ---------- */
    function make(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text) element.textContent = text;
        return element;
    }

    function addFavicon(badge, url) {
        const parsedUrl = new URL(url);
        const sources = [
            "https://www.google.com/s2/favicons?domain_url=" +
                encodeURIComponent(parsedUrl.origin) +
                "&sz=64&default=404",
            "https://icons.duckduckgo.com/ip3/" + encodeURIComponent(parsedUrl.hostname) + ".ico",
            new URL("/favicon.ico", parsedUrl.origin).href,
            new URL("/favicon.svg", parsedUrl.origin).href,
            new URL("/apple-touch-icon.png", parsedUrl.origin).href,
        ];
        // Providers block pixel inspection; size checks can also reject genuine icons.
        const placeholderSizes = [16, 48];
        const image = make("img", "favicon");
        let sourceIndex = 0;
        image.alt = "";
        image.width = 64;
        image.height = 64;
        image.decoding = "async";
        image.setAttribute("fetchpriority", "low");
        image.addEventListener("load", function () {
            const placeholderSize = placeholderSizes[sourceIndex - 1];
            if (placeholderSize && image.naturalWidth === placeholderSize && image.naturalHeight === placeholderSize) {
                tryNextSource();
                return;
            }
            badge.classList.add("has-favicon");
        });

        function tryNextSource() {
            badge.classList.remove("has-favicon");
            if (sourceIndex < sources.length) image.src = sources[sourceIndex++];
        }

        image.addEventListener("error", tryNextSource);
        badge.appendChild(image);

        if (window.requestIdleCallback) {
            window.requestIdleCallback(tryNextSource, { timeout: 2000 });
        } else {
            window.setTimeout(tryNextSource, 1000);
        }
    }

    function renderHome() {
        const tiles = $("tiles");
        tiles.textContent = "";

        bookmarks.forEach(function (item) {
            const link = make("a", "tile");
            link.href = toUrl(item.url);
            const badge = make("span", "badge");
            badge.setAttribute("aria-hidden", "true");
            badge.appendChild(make("span", "badge-letter", Array.from(item.title)[0].toUpperCase()));
            addFavicon(badge, link.href);
            link.appendChild(badge);
            link.appendChild(make("span", "name", item.title));
            tiles.appendChild(link);
        });

        if (bookmarks.length < MAX_BOOKMARKS) {
            const add = make("button", "tile");
            add.type = "button";
            add.appendChild(make("span", "badge", "+"));
            add.appendChild(make("span", "name", "Add"));
            add.addEventListener("click", function () {
                openEditor(-1, true);
            });
            tiles.appendChild(add);
        }
    }

    function renderList() {
        const list = $("list");
        list.textContent = "";
        bookmarks.forEach(function (item, index) {
            const button = make("button");
            button.type = "button";
            button.appendChild(make("span", "name", item.title));
            button.appendChild(make("small", "", item.url.replace(/^https?:\/\/(www\.)?/, "")));
            button.addEventListener("click", function () {
                openEditor(index, false);
            });
            list.appendChild(button);
        });
        $("listTitle").textContent = "Edit bookmarks (" + bookmarks.length + " of " + MAX_BOOKMARKS + ")";
        $("addButton").hidden = bookmarks.length >= MAX_BOOKMARKS;
    }

    /* ---------- Editor ---------- */
    const overlay = $("overlay");
    let editing = -1; // index being edited, -1 for a new bookmark
    let fromHome = false; // opened with the "Add" tile
    let confirmRemove = false;

    function showOverlay() {
        overlay.hidden = false;
        $("app").inert = true;
    }

    function closeOverlay(target) {
        overlay.hidden = true;
        $("app").inert = false;
        applySettings();
        renderHome();
        (target ? target() : $("editButton")).focus();
    }

    function showList(focusIndex) {
        showOverlay();
        renderList();
        $("editForm").hidden = true;
        $("listView").hidden = false;
        const items = $("list").children;
        (items[Math.min(focusIndex || 0, items.length - 1)] || $("addButton")).focus();
    }

    function openEditor(index, openedFromHome) {
        editing = index;
        fromHome = openedFromHome;
        confirmRemove = false;
        showOverlay();
        $("listView").hidden = true;
        $("editForm").hidden = false;
        $("editTitle").textContent = index < 0 ? "Add bookmark" : "Edit bookmark";
        $("bmTitle").value = index < 0 ? "" : bookmarks[index].title;
        $("bmUrl").value = index < 0 ? "" : bookmarks[index].url;
        $("editMessage").textContent = "";
        $("removeButton").hidden = index < 0;
        $("removeButton").textContent = "Remove";
        $("bmTitle").focus();
    }

    function leaveEditor() {
        if (fromHome) {
            closeOverlay(function () {
                return $("tiles").lastElementChild;
            });
        } else {
            showList(editing < 0 ? bookmarks.length : editing);
        }
    }

    function goBack() {
        if ($("editForm").hidden) closeOverlay();
        else leaveEditor();
    }

    $("editButton").addEventListener("click", function () {
        showList(0);
    });
    $("addButton").addEventListener("click", function () {
        openEditor(-1, false);
    });
    $("doneButton").addEventListener("click", function () {
        closeOverlay();
    });
    $("cancelButton").addEventListener("click", leaveEditor);

    $("editForm").addEventListener("submit", function (event) {
        event.preventDefault();
        const url = toUrl($("bmUrl").value);
        if (!url) {
            $("editMessage").textContent = "Enter a web address such as example.com";
            return $("bmUrl").focus();
        }
        const title = $("bmTitle").value.trim() || new URL(url).hostname.replace(/^www\./, "");
        const index = editing < 0 ? bookmarks.length : editing;
        bookmarks[index] = { title: title, url: url };
        const stored = save();

        if (fromHome && stored) {
            closeOverlay(function () {
                return $("tiles").children[index];
            });
        } else {
            showList(index);
        }
    });

    $("removeButton").addEventListener("click", function () {
        // Ask for a second press, so one accidental click removes nothing
        if (!confirmRemove) {
            confirmRemove = true;
            this.textContent = "Press again to remove";
            return;
        }
        bookmarks.splice(editing, 1);
        save();
        showList(editing);
    });

    /* ---------- Settings panel ---------- */
    const settingsDialog = $("settingsDialog");
    const settingsFallback = $("settingsFallback");
    const nativeSettingsDialog =
        typeof settingsDialog.showModal === "function" && typeof settingsDialog.close === "function";
    const settingsViews = {
        main: { view: "settingsMain", title: "settingsTitle" },
        appearance: {
            view: "appearanceView",
            title: "appearanceTitle",
            opener: "openAppearanceButton",
            back: "appearanceBackButton",
        },
        dateTime: {
            view: "dateTimeView",
            title: "dateTimeTitle",
            opener: "openDateTimeButton",
            back: "dateTimeBackButton",
        },
        defaultFocus: {
            view: "defaultFocusView",
            title: "defaultFocusTitle",
            opener: "openDefaultFocusButton",
            back: "defaultFocusBackButton",
        },
        engines: {
            view: "enginesView",
            title: "enginesTitle",
            opener: "openEnginesButton",
            back: "enginesBackButton",
        },
    };
    let activeSettingsView = "main";

    if (!nativeSettingsDialog) {
        settingsDialog.classList.add("fallback");
        settingsDialog.setAttribute("role", "dialog");
        settingsDialog.setAttribute("aria-modal", "true");
        settingsFallback.appendChild(settingsDialog);
    }

    function settingsOpen() {
        return nativeSettingsDialog ? settingsDialog.open : !settingsFallback.hidden;
    }

    function closeSettings() {
        if (nativeSettingsDialog) {
            settingsDialog.close();
        } else {
            settingsFallback.hidden = true;
            settingsDialog.hidden = true;
            $("app").inert = false;
            $("app").removeAttribute("aria-hidden");
            $("settingsButton").focus();
        }
    }

    function showSettingsView(name) {
        const previous = settingsViews[activeSettingsView];
        activeSettingsView = name;
        Object.keys(settingsViews).forEach(function (key) {
            $(settingsViews[key].view).hidden = key !== name;
        });
        const view = settingsViews[name];
        settingsDialog.setAttribute("aria-labelledby", view.title);
        settingsDialog.scrollTop = 0;
        $(name === "main" ? previous.opener || "settingsCloseButton" : view.back).focus();
    }

    $("settingsButton").addEventListener("click", function () {
        applySettings();
        showSettingsView("main");
        settingsDialog.hidden = false;
        if (nativeSettingsDialog) {
            settingsDialog.showModal();
        } else {
            settingsFallback.hidden = false;
            $("app").inert = true;
        }
        $("settingsCloseButton").focus();
        if (!nativeSettingsDialog) $("app").setAttribute("aria-hidden", "true");
    });

    Object.keys(settingsViews).forEach(function (name) {
        if (name === "main") return;
        const view = settingsViews[name];
        $(view.opener).addEventListener("click", function () {
            if (name === "engines") $("engineMessage").textContent = "";
            showSettingsView(name);
        });
        $(view.back).addEventListener("click", function () {
            showSettingsView("main");
        });
    });

    $("settingsCloseButton").addEventListener("click", function () {
        closeSettings();
    });

    $("settingsDoneButton").addEventListener("click", function () {
        closeSettings();
    });

    settingsFallback.addEventListener("click", function (event) {
        if (event.target === settingsFallback) closeSettings();
    });

    Array.prototype.forEach.call(document.querySelectorAll('input[name="accent"]'), function (input) {
        input.addEventListener("change", function () {
            settings.accent = input.value;
            saveSettings();
            applySettings();
        });
    });

    $("darkMode").addEventListener("change", function () {
        settings.darkMode = this.checked;
        saveSettings();
        applySettings();
    });

    $("hour24").addEventListener("change", function () {
        settings.hour24 = this.checked;
        saveSettings();
        tick();
    });

    Array.prototype.forEach.call(document.querySelectorAll('input[name="dateFormat"]'), function (input) {
        input.addEventListener("change", function () {
            settings.dateFormat = this.value;
            saveSettings();
            tick();
        });
    });

    Array.prototype.forEach.call(document.querySelectorAll('input[name="defaultFocus"]'), function (input) {
        input.addEventListener("change", function () {
            settings.defaultFocus = this.value;
            saveSettings();
        });
    });

    Array.prototype.forEach.call(document.querySelectorAll('input[name="searchEngineEnabled"]'), function (input) {
        input.addEventListener("change", function () {
            if (!this.checked && settings.searchEngines.length === 1) {
                this.checked = true;
                $("engineMessage").textContent = "Keep at least one search engine enabled.";
                return;
            }
            $("engineMessage").textContent = "";
            if (this.checked) {
                if (!settings.searchEngines.includes(this.value)) settings.searchEngines.push(this.value);
            } else {
                settings.searchEngines = settings.searchEngines.filter(function (id) {
                    return id !== input.value;
                });
            }
            if (!settings.searchEngines.includes(settings.searchEngine)) {
                settings.searchEngine = settings.searchEngines[0];
            }
            saveSettings();
            applySettings();
        });
    });

    $("resetSettingsButton").addEventListener("click", resetSettings);

    if (systemDark.addEventListener) {
        systemDark.addEventListener("change", function () {
            if (settings.darkMode === null) applySettings();
        });
    }

    /* ---------- Remote control navigation ---------- */
    const ARROWS = { ArrowLeft: "left", ArrowUp: "up", ArrowRight: "right", ArrowDown: "down" };
    const BACK_KEYS = new Set(["Escape", "Back", "GoBack", "BrowserBack", "XF86Back"]);

    function focusable() {
        let scope = overlay.hidden ? $("app") : overlay;
        if (settingsOpen()) scope = settingsDialog;
        return Array.prototype.filter.call(scope.querySelectorAll("a[href], button, input"), function (element) {
            return element.getClientRects().length > 0;
        });
    }

    // Left/Right stay on the same row. Up/Down go to the closest row,
    // then to the item in that row that lines up best.
    function findNext(current, direction) {
        const from = current.getBoundingClientRect();
        const vertical = direction === "up" || direction === "down";
        const sign = direction === "down" || direction === "right" ? 1 : -1;
        let best = null;
        let bestScore = Infinity;

        focusable().forEach(function (element) {
            if (element === current) return;
            const to = element.getBoundingClientRect();
            let distance, score;
            if (vertical) {
                distance = sign > 0 ? to.top - from.bottom : from.top - to.bottom;
                if (distance < -1) return;
                const offset = Math.abs(to.left + to.right - (from.left + from.right)) / 2;
                score = Math.round(distance / 8) * 100000 + offset;
            } else {
                if (to.bottom <= from.top || to.top >= from.bottom) return;
                distance = sign > 0 ? to.left - from.right : from.left - to.right;
                if (distance < -1) return;
                score = distance;
            }
            if (score < bestScore) {
                best = element;
                bestScore = score;
            }
        });
        return best;
    }

    function handleBackKey(event, typing) {
        if (settingsOpen()) {
            if (!BACK_KEYS.has(event.key) && !(event.key === "Backspace" && !typing)) return false;
            event.preventDefault();
            if (activeSettingsView !== "main") showSettingsView("main");
            else closeSettings();
            return true;
        }
        if (overlay.hidden) return false;
        if (!BACK_KEYS.has(event.key) && !(event.key === "Backspace" && !typing)) return false;
        event.preventDefault();
        goBack();
        return true;
    }

    function handleNumberKey(event, typing) {
        if (settingsOpen() || !overlay.hidden || typing || !/^\d$/.test(event.key)) return false;
        code.focus();
        return true;
    }

    function textCursorCanMove(active, typing, direction) {
        if (!typing) return true;
        if (direction !== "left" && direction !== "right") return true;

        // In a text box, Left/Right move the cursor until it reaches an end
        const edge = direction === "left" ? 0 : active.value.length;
        return active.selectionStart === edge && active.selectionEnd === edge;
    }

    function focusFallback(event, items) {
        event.preventDefault();
        if (items.length) (settingsOpen() || !overlay.hidden ? items[0] : code).focus();
    }

    function focusNext(next) {
        next.focus();
        if (next.scrollIntoView) next.scrollIntoView({ block: "nearest" });
    }

    function handleArrowKey(event, active, typing, direction) {
        if (!direction) return;
        if (!textCursorCanMove(active, typing, direction)) return;

        const items = focusable();
        if (!items.includes(active)) {
            focusFallback(event, items);
            return;
        }

        event.preventDefault();
        const next = findNext(active, direction);
        if (next) focusNext(next);
    }

    document.addEventListener("keydown", function (event) {
        if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
        const active = document.activeElement;
        const typing = active?.tagName === "INPUT" && (active.type === "text" || active.type === "search");
        const direction = ARROWS[event.key];

        if (handleBackKey(event, typing)) return;
        if (!nativeSettingsDialog && settingsOpen() && event.key === "Tab") {
            const items = focusable();
            if (event.shiftKey && active === items[0]) {
                event.preventDefault();
                items[items.length - 1].focus();
            } else if (!event.shiftKey && active === items[items.length - 1]) {
                event.preventDefault();
                items[0].focus();
            }
        }
        if (handleNumberKey(event, typing)) return;
        handleArrowKey(event, active, typing, direction);
    });

    // Keep focus inside the editor while it is open
    document.addEventListener("focusin", function (event) {
        if (!overlay.hidden && !overlay.contains(event.target)) focusable()[0].focus();
        if (!nativeSettingsDialog && settingsOpen() && !settingsDialog.contains(event.target)) {
            focusable()[0].focus();
        }
    });

    /* ---------- Start (also runs after the Back button) ---------- */
    window.addEventListener("pageshow", function () {
        $("goButton").textContent = "Go";
        bookmarks = load();
        updateCode();
        if (overlay.hidden) {
            renderHome();
            focusDefaultInput();
        }
    });

    applySettings();
    renderHome();
    focusDefaultInput();
})();
