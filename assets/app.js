(function () {
    "use strict";

    var STORAGE_KEY = "tvHome.bookmarks";
    var SETTINGS_KEY = "tvHome.settings";
    var MAX_BOOKMARKS = 12; // two rows, so the home screen never needs scrolling
    var MAX_DIGITS = 10;
    var DEFAULT_SETTINGS = {
        accent: "orange",
        darkMode: null,
        hour24: false,
        dateFormat: "long-day-first",
        defaultFocus: "code",
        searchEngines: ["google"],
        searchEngine: "google",
    };
    var DEFAULTS = [
        { title: "YouTube", url: "https://www.youtube.com/" },
        { title: "GitHub", url: "https://github.com/" },
        { title: "Speed Test", url: "https://www.fast.com/" },
        { title: "FMHY", url: "https://fmhy.net/video#streaming-sites" },
    ];
    var SEARCH_ENGINES = {
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
    var DATE_FORMATS = {
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

    function $(query) {
        return document.querySelector(query);
    }

    function defaultSettings() {
        var copy = {};
        Object.keys(DEFAULT_SETTINGS).forEach(function (key) {
            copy[key] = DEFAULT_SETTINGS[key];
        });
        copy.searchEngines = DEFAULT_SETTINGS.searchEngines.slice();
        return copy;
    }

    /* ---------- Settings ---------- */
    function loadSettings() {
        try {
            var saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
            if (saved && typeof saved === "object") {
                var loaded = defaultSettings();
                Object.keys(DEFAULT_SETTINGS).forEach(function (key) {
                    if (Object.prototype.hasOwnProperty.call(saved, key)) loaded[key] = saved[key];
                });
                delete loaded.reduceMotion;
                if (loaded.dateFormat === "long" || loaded.dateFormat === "day-first") {
                    loaded.dateFormat = "long-day-first";
                } else if (loaded.dateFormat === "month-first") {
                    loaded.dateFormat = "long-month-first";
                }
                if (!Object.prototype.hasOwnProperty.call(DATE_FORMATS, loaded.dateFormat)) {
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
                if (loaded.searchEngines.indexOf(loaded.searchEngine) === -1) {
                    loaded.searchEngine = loaded.searchEngines[0];
                }
                return loaded;
            }
        } catch (error) {
            /* storage blocked or damaged: use defaults */
        }
        return defaultSettings();
    }

    function saveSettings() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            $("#settingsMessage").textContent = "";
        } catch (error) {
            $("#settingsMessage").textContent =
                "This browser blocked saving. Changes will be lost when the page reloads.";
        }
    }

    var systemDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : { matches: false };
    var settings = loadSettings();

    function focusDefaultInput() {
        (settings.defaultFocus === "search" ? $("#query") : $("#code")).focus();
    }

    function resolvedDarkMode() {
        return settings.darkMode === null ? systemDark.matches : settings.darkMode;
    }

    function applySettings() {
        var dark = resolvedDarkMode();
        var modeName = dark ? "dark" : "light";
        var colorScheme = settings.darkMode === null ? "light dark" : modeName;
        document.documentElement.setAttribute("data-accent", settings.accent);
        document.documentElement.setAttribute("data-scheme", modeName);
        document.querySelector('meta[name="color-scheme"]').content = colorScheme;
        document.querySelector('meta[name="theme-color"]').content = dark ? "#0E0E10" : "#F2F2F5";

        $("#darkMode").checked = dark;
        $("#darkModeDescription").textContent =
            settings.darkMode === null ? "Following system: " + modeName : "Manually set to " + modeName;
        $("#hour24").checked = Boolean(settings.hour24);
        Array.prototype.forEach.call(document.querySelectorAll('input[name="dateFormat"]'), function (input) {
            input.checked = input.value === settings.dateFormat;
        });
        Array.prototype.forEach.call(document.querySelectorAll('input[name="defaultFocus"]'), function (input) {
            input.checked = input.value === settings.defaultFocus;
        });
        var accentInput = document.querySelector('input[name="accent"][value="' + settings.accent + '"]');
        if (accentInput) accentInput.checked = true;
        Array.prototype.forEach.call(document.querySelectorAll('input[name="searchEngineEnabled"]'), function (input) {
            input.checked = settings.searchEngines.indexOf(input.value) !== -1;
        });
        updateSearchEnginePicker();
        tick();
    }

    function resetSettings() {
        settings = defaultSettings();
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
        var preset = DATE_FORMATS[format];
        var weekday, day, month;
        if (typeof Intl !== "undefined" && Intl.DateTimeFormat && Intl.DateTimeFormat.prototype.formatToParts) {
            new Intl.DateTimeFormat(preset.locale, preset.options).formatToParts(now).forEach(function (part) {
                if (part.type === "weekday") weekday = part.value;
                if (part.type === "day") day = part.value;
                if (part.type === "month") month = part.value;
            });
        } else {
            weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];
            day = now.getDate();
            month = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December",
            ][now.getMonth()];
        }
        return format === "long-day-first"
            ? weekday + ", " + day + " " + month
            : weekday + ", " + month + " " + day;
    }

    function tick() {
        var now = new Date();
        var time;
        if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
            time = now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: !settings.hour24,
            });
        } else {
            var hours = now.getHours();
            time = ("0" + (settings.hour24 ? hours : hours % 12 || 12)).slice(-2) +
                ":" + ("0" + now.getMinutes()).slice(-2);
            if (!settings.hour24) time += hours < 12 ? " AM" : " PM";
        }
        var date = formatDate(now, settings.dateFormat);
        if ($("#time").textContent !== time) $("#time").textContent = time;
        if ($("#date").textContent !== date) $("#date").textContent = date;
        Object.keys(DATE_FORMATS).forEach(function (format) {
            var preview = $("#" + DATE_FORMATS[format].preview);
            var text = formatDate(now, format);
            if (preview.textContent !== text) preview.textContent = text;
        });
    }
    tick();
    setInterval(tick, 1000);

    /* ---------- Address detection ---------- */
    var LABEL = "[a-z0-9\\u00a1-\\uffff](?:[a-z0-9_\\-\\u00a1-\\uffff]*[a-z0-9\\u00a1-\\uffff])?";
    var TLD = "(?:xn--[a-z0-9-]+|[a-z\\u00a1-\\uffff]{2,})";
    var REST = "(?::\\d{1,5})?(?:[/?#]\\S*)?$";
    var DOMAIN = new RegExp("^(?:" + LABEL + "\\.)+" + TLD + "\\.?" + REST, "i");
    var OCTET = "(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)";
    var LOCAL = new RegExp("^(?:localhost|(?:" + OCTET + "\\.){3}" + OCTET + ")" + REST, "i");

    function parseUrl(value) {
        var link = document.createElement("a");
        link.href = value;
        return link;
    }

    // Returns a full web address, or null when the text is not one
    function toUrl(text) {
        var value = text.trim();
        var full;
        if (!value || /\s/.test(value)) return null;
        if (/^https?:\/\//i.test(value)) full = value;
        else if (LOCAL.test(value)) full = "http://" + value;
        else if (DOMAIN.test(value)) full = "https://" + value;
        else return null;
        try {
            var url = parseUrl(full);
            return /^https?:$/.test(url.protocol) && url.hostname ? url.href : null;
        } catch (error) {
            return null;
        }
    }

    /* ---------- Search bar ---------- */
    var query = $("#query");

    function updateSearchEnginePicker() {
        var enabled = settings.searchEngines.filter(function (id) {
            return SEARCH_ENGINES[id];
        });
        var picker = $("#searchEnginePicker");
        var select = $("#searchEngine");
        var search = $("#searchForm");

        select.textContent = "";
        enabled.forEach(function (id) {
            var option = document.createElement("option");
            option.value = id;
            option.textContent = SEARCH_ENGINES[id].name;
            select.appendChild(option);
        });

        if (enabled.indexOf(settings.searchEngine) === -1) settings.searchEngine = enabled[0] || "google";
        select.value = settings.searchEngine;
        $("#searchEngineIcon").src = "assets/search-icons/" + SEARCH_ENGINES[settings.searchEngine].icon;
        $("#searchEngineIcon").alt = "";

        var multiple = enabled.length > 1;
        picker.hidden = !multiple;
        if (multiple) search.classList.add("has-engine-picker");
        else search.classList.remove("has-engine-picker");
        var name = SEARCH_ENGINES[settings.searchEngine].name;
        query.placeholder = "Search " + name + " or type a web address";
        query.setAttribute("aria-label", "Search " + name + " or type a web address");
    }

    $("#searchEngine").addEventListener("change", function () {
        settings.searchEngine = this.value;
        saveSettings();
        updateSearchEnginePicker();
    });

    query.addEventListener("input", function () {
        $("#searchButton").textContent = toUrl(query.value) ? "Open site" : "Search";
    });

    $("#searchForm").addEventListener("submit", function (event) {
        event.preventDefault();
        var text = query.value.trim();
        if (!text) return query.focus();
        var url = toUrl(text);
        if (url) {
            window.location.href = url;
        } else {
            var engine = SEARCH_ENGINES[settings.searchEngine] || SEARCH_ENGINES.google;
            window.location.href = engine.url + encodeURIComponent(text);
        }
    });

    /* ---------- Code entry ---------- */
    var code = $("#code");

    function updateCode() {
        code.value = code.value.replace(/\D/g, "").slice(0, MAX_DIGITS);
        $("#preview").textContent = "aftv.news/" + (code.value || "…");
    }

    code.addEventListener("input", updateCode);

    $("#codeForm").addEventListener("submit", function (event) {
        event.preventDefault();
        updateCode();
        if (!code.value) return code.focus();
        $("#goButton").textContent = "Opening…";
        window.location.href = "https://aftv.news/" + code.value;
    });

    /* ---------- Bookmark storage ---------- */
    function load() {
        try {
            var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
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
            $("#listMessage").textContent = "";
            return true;
        } catch (error) {
            $("#listMessage").textContent = "This browser blocked saving. Changes will be lost when the page reloads.";
            return false;
        }
    }

    var bookmarks = load();

    /* ---------- Rendering ---------- */
    function make(tag, className, text) {
        var element = document.createElement(tag);
        if (className) element.className = className;
        if (text) element.textContent = text;
        return element;
    }

    function addFavicon(badge, url) {
        var parsedUrl = parseUrl(url);
        var origin = parsedUrl.protocol + "//" + parsedUrl.host;
        var sources = [
            "https://www.google.com/s2/favicons?domain_url=" +
                encodeURIComponent(origin) +
                "&sz=64&default=404",
            "https://icons.duckduckgo.com/ip3/" + encodeURIComponent(parsedUrl.hostname) + ".ico",
            origin + "/favicon.ico",
            origin + "/favicon.svg",
            origin + "/apple-touch-icon.png",
        ];
        // Providers block pixel inspection; size checks can also reject genuine icons.
        var placeholderSizes = [16, 48];
        var image = make("img", "favicon");
        var sourceIndex = 0;
        image.alt = "";
        image.width = 64;
        image.height = 64;
        image.decoding = "async";
        image.setAttribute("fetchpriority", "low");
        image.addEventListener("load", function () {
            var placeholderSize = placeholderSizes[sourceIndex - 1];
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
        var tiles = $("#tiles");
        tiles.textContent = "";

        bookmarks.forEach(function (item) {
            var link = make("a", "tile");
            link.href = toUrl(item.url);
            var badge = make("span", "badge");
            badge.setAttribute("aria-hidden", "true");
            var firstCharacter = item.title.charAt(0);
            if (/[\uD800-\uDBFF]/.test(firstCharacter)) firstCharacter += item.title.charAt(1);
            badge.appendChild(make("span", "badge-letter", firstCharacter.toUpperCase()));
            addFavicon(badge, link.href);
            link.appendChild(badge);
            link.appendChild(make("span", "name", item.title));
            tiles.appendChild(link);
        });

        if (bookmarks.length < MAX_BOOKMARKS) {
            var add = make("button", "tile");
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
        var list = $("#list");
        list.textContent = "";
        bookmarks.forEach(function (item, index) {
            var button = make("button");
            button.type = "button";
            button.appendChild(make("span", "name", item.title));
            button.appendChild(make("small", "", item.url.replace(/^https?:\/\/(www\.)?/, "")));
            button.addEventListener("click", function () {
                openEditor(index, false);
            });
            list.appendChild(button);
        });
        $("#listTitle").textContent = "Edit bookmarks (" + bookmarks.length + " of " + MAX_BOOKMARKS + ")";
        $("#addButton").hidden = bookmarks.length >= MAX_BOOKMARKS;
    }

    /* ---------- Editor ---------- */
    var overlay = $("#overlay");
    var editing = -1; // index being edited, -1 for a new bookmark
    var fromHome = false; // opened with the "Add" tile
    var confirmRemove = false;

    function showOverlay() {
        overlay.hidden = false;
        $("#app").inert = true;
    }

    function closeOverlay(target) {
        overlay.hidden = true;
        $("#app").inert = false;
        applySettings();
        renderHome();
        (target ? target() : $("#editButton")).focus();
    }

    function showList(focusIndex) {
        showOverlay();
        renderList();
        $("#editForm").hidden = true;
        $("#listView").hidden = false;
        var items = $("#list").children;
        (items[Math.min(focusIndex || 0, items.length - 1)] || $("#addButton")).focus();
    }

    function openEditor(index, openedFromHome) {
        editing = index;
        fromHome = openedFromHome;
        confirmRemove = false;
        showOverlay();
        $("#listView").hidden = true;
        $("#editForm").hidden = false;
        $("#editTitle").textContent = index < 0 ? "Add bookmark" : "Edit bookmark";
        $("#bmTitle").value = index < 0 ? "" : bookmarks[index].title;
        $("#bmUrl").value = index < 0 ? "" : bookmarks[index].url;
        $("#editMessage").textContent = "";
        $("#removeButton").hidden = index < 0;
        $("#removeButton").textContent = "Remove";
        $("#bmTitle").focus();
    }

    function leaveEditor() {
        if (fromHome) {
            closeOverlay(function () {
                return $("#tiles").lastElementChild;
            });
        } else {
            showList(editing < 0 ? bookmarks.length : editing);
        }
    }

    function goBack() {
        if ($("#editForm").hidden) closeOverlay();
        else leaveEditor();
    }

    $("#editButton").addEventListener("click", function () {
        showList(0);
    });
    $("#addButton").addEventListener("click", function () {
        openEditor(-1, false);
    });
    $("#doneButton").addEventListener("click", function () {
        closeOverlay();
    });
    $("#cancelButton").addEventListener("click", leaveEditor);

    $("#editForm").addEventListener("submit", function (event) {
        event.preventDefault();
        var url = toUrl($("#bmUrl").value);
        if (!url) {
            $("#editMessage").textContent = "Enter a web address such as example.com";
            return $("#bmUrl").focus();
        }
        var title = $("#bmTitle").value.trim() || parseUrl(url).hostname.replace(/^www\./, "");
        var index = editing < 0 ? bookmarks.length : editing;
        bookmarks[index] = { title: title, url: url };
        var stored = save();

        if (fromHome && stored) {
            closeOverlay(function () {
                return $("#tiles").children[index];
            });
        } else {
            showList(index);
        }
    });

    $("#removeButton").addEventListener("click", function () {
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
    var settingsDialog = $("#settingsDialog");
    var settingsFallback = $("#settingsFallback");
    var nativeSettingsDialog =
        typeof settingsDialog.showModal === "function" && typeof settingsDialog.close === "function";
    var settingsViews = {
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
    var activeSettingsView = "main";

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
            $("#app").inert = false;
            $("#app").removeAttribute("aria-hidden");
            $("#settingsButton").focus();
        }
    }

    function showSettingsView(name) {
        var previous = settingsViews[activeSettingsView];
        activeSettingsView = name;
        Object.keys(settingsViews).forEach(function (key) {
            $("#" + settingsViews[key].view).hidden = key !== name;
        });
        var view = settingsViews[name];
        settingsDialog.setAttribute("aria-labelledby", view.title);
        settingsDialog.scrollTop = 0;
        $("#" + (name === "main" ? previous.opener || "settingsCloseButton" : view.back)).focus();
    }

    $("#settingsButton").addEventListener("click", function () {
        applySettings();
        showSettingsView("main");
        settingsDialog.hidden = false;
        if (nativeSettingsDialog) {
            settingsDialog.showModal();
        } else {
            settingsFallback.hidden = false;
            $("#app").inert = true;
        }
        $("#settingsCloseButton").focus();
        if (!nativeSettingsDialog) $("#app").setAttribute("aria-hidden", "true");
    });

    Object.keys(settingsViews).forEach(function (name) {
        if (name === "main") return;
        var view = settingsViews[name];
        $("#" + view.opener).addEventListener("click", function () {
            if (name === "engines") $("#engineMessage").textContent = "";
            showSettingsView(name);
        });
        $("#" + view.back).addEventListener("click", function () {
            showSettingsView("main");
        });
    });

    $("#settingsCloseButton").addEventListener("click", function () {
        closeSettings();
    });

    $("#settingsDoneButton").addEventListener("click", function () {
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

    $("#darkMode").addEventListener("change", function () {
        settings.darkMode = this.checked;
        saveSettings();
        applySettings();
    });

    $("#hour24").addEventListener("change", function () {
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
                $("#engineMessage").textContent = "Keep at least one search engine enabled.";
                return;
            }
            $("#engineMessage").textContent = "";
            if (this.checked) {
                if (settings.searchEngines.indexOf(this.value) === -1) settings.searchEngines.push(this.value);
            } else {
                settings.searchEngines = settings.searchEngines.filter(function (id) {
                    return id !== input.value;
                });
            }
            if (settings.searchEngines.indexOf(settings.searchEngine) === -1) {
                settings.searchEngine = settings.searchEngines[0];
            }
            saveSettings();
            applySettings();
        });
    });

    $("#resetSettingsButton").addEventListener("click", resetSettings);

    function systemThemeChanged() {
        if (settings.darkMode === null) applySettings();
    }

    if (systemDark.addEventListener) systemDark.addEventListener("change", systemThemeChanged);
    else if (systemDark.addListener) systemDark.addListener(systemThemeChanged);

    /* ---------- Remote control navigation ---------- */
    var ARROWS = { ArrowLeft: "left", ArrowUp: "up", ArrowRight: "right", ArrowDown: "down" };
    var BACK_KEYS = ["Escape", "Back", "GoBack", "BrowserBack", "XF86Back"];
    var KEY_CODES = {
        8: "Backspace", 9: "Tab", 13: "Enter", 27: "Escape",
        37: "ArrowLeft", 38: "ArrowUp", 39: "ArrowRight", 40: "ArrowDown", 461: "Back",
    };

    function eventKey(event) {
        var key = event.key;
        if (key === "Esc") return "Escape";
        if (/^(Left|Up|Right|Down)$/.test(key)) return "Arrow" + key;
        if (key && key !== "Unidentified") return key;
        var keyCode = event.which || event.keyCode;
        if (keyCode >= 48 && keyCode <= 57) return String(keyCode - 48);
        if (keyCode >= 96 && keyCode <= 105) return String(keyCode - 96);
        return KEY_CODES[keyCode] || "";
    }

    function focusable() {
        var scope = overlay.hidden ? $("#app") : overlay;
        if (settingsOpen()) scope = settingsDialog;
        return Array.prototype.filter.call(scope.querySelectorAll("a[href], button, input"), function (element) {
            return element.getClientRects().length > 0;
        });
    }

    // Left/Right stay on the same row. Up/Down go to the closest row,
    // then to the item in that row that lines up best.
    function findNext(current, direction) {
        var from = current.getBoundingClientRect();
        var vertical = direction === "up" || direction === "down";
        var sign = direction === "down" || direction === "right" ? 1 : -1;
        var best = null;
        var bestScore = Infinity;

        focusable().forEach(function (element) {
            if (element === current) return;
            var to = element.getBoundingClientRect();
            var distance, score;
            if (vertical) {
                distance = sign > 0 ? to.top - from.bottom : from.top - to.bottom;
                if (distance < -1) return;
                var offset = Math.abs(to.left + to.right - (from.left + from.right)) / 2;
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

    function handleBackKey(event, typing, key) {
        if (settingsOpen()) {
            if (BACK_KEYS.indexOf(key) === -1 && !(key === "Backspace" && !typing)) return false;
            event.preventDefault();
            if (activeSettingsView !== "main") showSettingsView("main");
            else closeSettings();
            return true;
        }
        if (overlay.hidden) return false;
        if (BACK_KEYS.indexOf(key) === -1 && !(key === "Backspace" && !typing)) return false;
        event.preventDefault();
        goBack();
        return true;
    }

    function handleNumberKey(key, typing) {
        if (settingsOpen() || !overlay.hidden || typing || !/^\d$/.test(key)) return false;
        code.focus();
        return true;
    }

    function textCursorCanMove(active, typing, direction) {
        if (!typing) return true;
        if (direction !== "left" && direction !== "right") return true;

        // In a text box, Left/Right move the cursor until it reaches an end
        var edge = direction === "left" ? 0 : active.value.length;
        return active.selectionStart === edge && active.selectionEnd === edge;
    }

    function focusFallback(event, items) {
        event.preventDefault();
        if (items.length) (settingsOpen() || !overlay.hidden ? items[0] : code).focus();
    }

    function focusNext(next) {
        next.focus();
        if (next.scrollIntoView) {
            if ("scrollBehavior" in document.documentElement.style) next.scrollIntoView({ block: "nearest" });
            else next.scrollIntoView(false);
        }
    }

    function handleArrowKey(event, active, typing, direction) {
        if (!direction) return;
        if (!textCursorCanMove(active, typing, direction)) return;

        var items = focusable();
        if (items.indexOf(active) === -1) {
            focusFallback(event, items);
            return;
        }

        event.preventDefault();
        var next = findNext(active, direction);
        if (next) focusNext(next);
    }

    document.addEventListener("keydown", function (event) {
        if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
        var active = document.activeElement;
        var typing = active && active.tagName === "INPUT" && (active.type === "text" || active.type === "search");
        var key = eventKey(event);
        var direction = ARROWS[key];

        if (handleBackKey(event, typing, key)) return;
        if (!nativeSettingsDialog && settingsOpen() && key === "Tab") {
            var items = focusable();
            if (event.shiftKey && active === items[0]) {
                event.preventDefault();
                items[items.length - 1].focus();
            } else if (!event.shiftKey && active === items[items.length - 1]) {
                event.preventDefault();
                items[0].focus();
            }
        }
        if (handleNumberKey(key, typing)) return;
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
        $("#goButton").textContent = "Go";
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
