(function () {
    "use strict";

    var STORAGE_KEY = "tvHome.bookmarks";
    var MAX_BOOKMARKS = 12; // two rows, so the home screen never needs scrolling
    var MAX_DIGITS = 10;
    var DEFAULTS = [
        { title: "YouTube", url: "https://www.youtube.com/" },
        { title: "GitHub", url: "https://github.com/" },
        { title: "Speed Test", url: "https://www.fast.com/" },
        { title: "FMHY", url: "https://fmhy.net/video#streaming-sites" },
    ];

    function $(id) {
        return document.getElementById(id);
    }

    /* ---------- Clock ---------- */
    function tick() {
        var now = new Date();
        var time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

    query.addEventListener("input", function () {
        $("searchButton").textContent = toUrl(query.value) ? "Open site" : "Search";
    });

    $("searchForm").addEventListener("submit", function (event) {
        event.preventDefault();
        var text = query.value.trim();
        if (!text) return query.focus();
        window.location.href = toUrl(text) || "https://www.google.com/search?q=" + encodeURIComponent(text);
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

    function renderHome() {
        var tiles = $("tiles");
        tiles.textContent = "";

        bookmarks.forEach(function (item) {
            var link = make("a", "tile");
            link.href = toUrl(item.url);
            var badge = make("span", "badge", Array.from(item.title)[0].toUpperCase());
            badge.setAttribute("aria-hidden", "true");
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

    /* ---------- Remote control navigation ---------- */
    var ARROWS = { ArrowLeft: "left", ArrowUp: "up", ArrowRight: "right", ArrowDown: "down" };
    var BACK_KEYS = new Set(["Escape", "Back", "GoBack", "BrowserBack", "XF86Back"]);

    function focusable() {
        var scope = overlay.hidden ? $("app") : overlay;
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
        if (overlay.hidden) return false;
        if (!BACK_KEYS.includes(event.key) && !(event.key === "Backspace" && !typing)) return false;
        event.preventDefault();
        goBack();
        return true;
    }

    function handleNumberKey(event, typing) {
        if (!overlay.hidden || typing || !/^\d$/.test(event.key)) return false;
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
        var typing = active?.tagName === "INPUT";
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
