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
        startpage: { name: "Startpage", icon: "startpage-color.svg", url: "https://www.startpage.com/sp/search?query=" },
        ecosia: { name: "Ecosia", icon: "ecosia-color.svg", url: "https://www.ecosia.org/search?q=" },
    };

    function $(id) {
        return document.getElementById(id);
    }

    /* ---------- Settings ---------- */
    function loadSettings() {
        try {
            var saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
            if (saved && typeof saved === "object") {
                var loaded = Object.assign({}, DEFAULT_SETTINGS, saved);
                delete loaded.reduceMotion;
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
        return Object.assign({}, DEFAULT_SETTINGS);
    }

    function saveSettings() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (error) {
            /* settings will remain active until the page reloads */
        }
    }

    var systemDark = window.matchMedia("(prefers-color-scheme: dark)");
    var settings = loadSettings();

    function resolvedDarkMode() {
        return settings.darkMode === null ? systemDark.matches : settings.darkMode;
    }

    function applySettings() {
        var dark = resolvedDarkMode();
        document.documentElement.dataset.accent = settings.accent;
        document.documentElement.dataset.scheme = dark ? "dark" : "light";
        document.querySelector('meta[name="color-scheme"]').content = settings.darkMode === null
            ? "light dark"
            : (dark ? "dark" : "light");
        document.querySelector('meta[name="theme-color"]').content = dark ? "#0E0E10" : "#F2F2F5";

        $("darkMode").checked = dark;
        $("darkModeDescription").textContent = settings.darkMode === null
            ? "Following system: " + (dark ? "dark" : "light")
            : "Manually set to " + (dark ? "dark" : "light");
        $("hour24").checked = Boolean(settings.hour24);
        var accentInput = document.querySelector('input[name="accent"][value="' + settings.accent + '"]');
        if (accentInput) accentInput.checked = true;
        document.querySelectorAll('input[name="searchEngineEnabled"]').forEach(function (input) {
            input.checked = settings.searchEngines.includes(input.value);
        });
        updateSearchEnginePicker();
        tick();
    }

    function resetSettings() {
        settings = Object.assign({}, DEFAULT_SETTINGS, {
            searchEngines: DEFAULT_SETTINGS.searchEngines.slice(),
        });
        saveSettings();
        applySettings();
    }

    /* ---------- Clock ---------- */
    function tick() {
        var now = new Date();
        var time = now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: settings.hour24 ? false : true,
        });
        var date = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
        if ($("time").textContent !== time) $("time").textContent = time;
        if ($("date").textContent !== date) $("date").textContent = date;
    }
    tick();
    setInterval(tick, 1000);

    /* ---------- Address detection ---------- */
    var LABEL = String.raw`[a-z0-9\u00a1-\uffff](?:[a-z0-9_\-\u00a1-\uffff]*[a-z0-9\u00a1-\uffff])?`;
    var TLD = String.raw`(?:xn--[a-z0-9-]+|[a-z\u00a1-\uffff]{2,})`;
    var REST = String.raw`(?::\d{1,5})?(?:[/?#]\S*)?$`;
    var DOMAIN = new RegExp("^(?:" + LABEL + String.raw`\.)+` + TLD + String.raw`\.?` + REST, "i");
    var OCTET = String.raw`(?:25[0-5]|2[0-4]\d|1?\d?\d)`;
    var LOCAL = new RegExp("^(?:localhost|(?:" + OCTET + String.raw`\.){3}` + OCTET + ")" + REST, "i");

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
            var url = new URL(full);
            return url.hostname ? url.href : null;
        } catch (error) {
            return null;
        }
    }

    /* ---------- Search bar ---------- */
    var query = $("query");

    function updateSearchEnginePicker() {
        var enabled = settings.searchEngines.filter(function (id) {
            return SEARCH_ENGINES[id];
        });
        var picker = $("searchEnginePicker");
        var select = $("searchEngine");
        var search = $("searchForm");

        select.textContent = "";
        enabled.forEach(function (id) {
            var option = document.createElement("option");
            option.value = id;
            option.textContent = SEARCH_ENGINES[id].name;
            select.appendChild(option);
        });

        if (!enabled.includes(settings.searchEngine)) settings.searchEngine = enabled[0] || "google";
        select.value = settings.searchEngine;
        $("searchEngineIcon").src = "assets/search-icons/" + SEARCH_ENGINES[settings.searchEngine].icon;
        $("searchEngineIcon").alt = "";

        var multiple = enabled.length > 1;
        picker.hidden = !multiple;
        search.classList.toggle("has-engine-picker", multiple);
        var name = SEARCH_ENGINES[settings.searchEngine].name;
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
    var code = $("code");

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
            $("listMessage").textContent = "";
            return true;
        } catch (error) {
            $("listMessage").textContent = "This browser blocked saving. Changes will be lost when the page reloads.";
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
        var parsedUrl = new URL(url);
        var sources = [
            "https://www.google.com/s2/favicons?domain_url=" +
                encodeURIComponent(parsedUrl.origin) +
                "&sz=64&default=404",
            "https://icons.duckduckgo.com/ip3/" + encodeURIComponent(parsedUrl.hostname) + ".ico",
            new URL("/favicon.ico", parsedUrl.origin).href,
            new URL("/favicon.svg", parsedUrl.origin).href,
            new URL("/apple-touch-icon.png", parsedUrl.origin).href,
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
        var tiles = $("tiles");
        tiles.textContent = "";

        bookmarks.forEach(function (item) {
            var link = make("a", "tile");
            link.href = toUrl(item.url);
            var badge = make("span", "badge");
            badge.setAttribute("aria-hidden", "true");
            badge.appendChild(make("span", "badge-letter", Array.from(item.title)[0].toUpperCase()));
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
        var list = $("list");
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
        $("listTitle").textContent = "Edit bookmarks (" + bookmarks.length + " of " + MAX_BOOKMARKS + ")";
        $("addButton").hidden = bookmarks.length >= MAX_BOOKMARKS;
    }

    /* ---------- Editor ---------- */
    var overlay = $("overlay");
    var editing = -1; // index being edited, -1 for a new bookmark
    var fromHome = false; // opened with the "Add" tile
    var confirmRemove = false;

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
        var items = $("list").children;
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
        var url = toUrl($("bmUrl").value);
        if (!url) {
            $("editMessage").textContent = "Enter a web address such as example.com";
            return $("bmUrl").focus();
        }
        var title = $("bmTitle").value.trim() || new URL(url).hostname.replace(/^www\./, "");
        var index = editing < 0 ? bookmarks.length : editing;
        bookmarks[index] = { title: title, url: url };
        var stored = save();

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
    var settingsDialog = $("settingsDialog");

    function showSettingsView(showEngines) {
        $("settingsMain").hidden = showEngines;
        $("enginesView").hidden = !showEngines;
        settingsDialog.setAttribute("aria-labelledby", showEngines ? "enginesTitle" : "settingsTitle");
        (showEngines ? $("enginesBackButton") : $("openEnginesButton")).focus();
    }

    $("settingsButton").addEventListener("click", function () {
        applySettings();
        $("settingsMain").hidden = false;
        $("enginesView").hidden = true;
        settingsDialog.setAttribute("aria-labelledby", "settingsTitle");
        settingsDialog.showModal();
        $("settingsCloseButton").focus();
    });

    $("openEnginesButton").addEventListener("click", function () {
        showSettingsView(true);
    });

    $("enginesBackButton").addEventListener("click", function () {
        showSettingsView(false);
    });

    $("settingsCloseButton").addEventListener("click", function () {
        settingsDialog.close();
    });

    $("settingsDoneButton").addEventListener("click", function () {
        settingsDialog.close();
    });

    document.querySelectorAll('input[name="accent"]').forEach(function (input) {
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

    document.querySelectorAll('input[name="searchEngineEnabled"]').forEach(function (input) {
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
    var ARROWS = { ArrowLeft: "left", ArrowUp: "up", ArrowRight: "right", ArrowDown: "down" };
    var BACK_KEYS = new Set(["Escape", "Back", "GoBack", "BrowserBack", "XF86Back"]);

    function focusable() {
        var scope = settingsDialog.open ? settingsDialog : (overlay.hidden ? $("app") : overlay);
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

    function handleBackKey(event, typing) {
        if (settingsDialog.open) {
            if (!BACK_KEYS.includes(event.key) && !(event.key === "Backspace" && !typing)) return false;
            event.preventDefault();
            if (!$("enginesView").hidden) showSettingsView(false);
            else settingsDialog.close();
            return true;
        }
        if (overlay.hidden) return false;
        if (!BACK_KEYS.includes(event.key) && !(event.key === "Backspace" && !typing)) return false;
        event.preventDefault();
        goBack();
        return true;
    }

    function handleNumberKey(event, typing) {
        if (settingsDialog.open || !overlay.hidden || typing || !/^\d$/.test(event.key)) return false;
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
        if (items.length) (overlay.hidden ? code : items[0]).focus();
    }

    function focusNext(next) {
        next.focus();
        if (next.scrollIntoView) next.scrollIntoView({ block: "nearest" });
    }

    function handleArrowKey(event, active, typing, direction) {
        if (!direction) return;
        if (!textCursorCanMove(active, typing, direction)) return;

        var items = focusable();
        if (!items.includes(active)) {
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
        var typing = active?.tagName === "INPUT" && (active.type === "text" || active.type === "search");
        var direction = ARROWS[event.key];

        if (handleBackKey(event, typing)) return;
        if (handleNumberKey(event, typing)) return;
        handleArrowKey(event, active, typing, direction);
    });

    // Keep focus inside the editor while it is open
    document.addEventListener("focusin", function (event) {
        if (!overlay.hidden && !overlay.contains(event.target)) focusable()[0].focus();
    });

    /* ---------- Start (also runs after the Back button) ---------- */
    window.addEventListener("pageshow", function () {
        $("goButton").textContent = "Go";
        bookmarks = load();
        updateCode();
        if (overlay.hidden) {
            renderHome();
            code.focus();
        }
    });

    renderHome();
    code.focus();
})();
