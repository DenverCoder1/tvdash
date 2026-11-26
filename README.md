# TVDash

TVDash is a customizable home page for TV browsers, bringing web search, bookmarks, a clock, and AFTVnews Downloader code entry together in one place.

Use your browser to open AFTVnews shortlinks with TVDash, so you don't need a separate Downloader app and can save space on your device. TVDash also includes the familiar features of a standard browser start page, with plenty of options to make it your own.

**Open TVDash:** [tvdash.demolab.com](https://tvdash.demolab.com)

<a href="https://tvdash.demolab.com"><img width="800" alt="image" src="https://github.com/user-attachments/assets/f7e915da-861b-4586-8999-ae17cc057ad0" /></a>

## Setup and Usage

Open your browser settings and set your Home Page to **https://tvdash.demolab.com**

### TV Bro Setup

1. Open the TV Bro Settings menu
2. Under 'Main', select 'Home page'
3. Set 'Home page' to 'Custom'
4. In 'Custom home page URL' enter 'https://tvdash.demolab.com'
5. Press enter to save and close the Settings menu

### Older browsers

TVDash uses ES5-compatible JavaScript for older stock Android browsers and embedded TV/projector browsers. Browsers without modern date formatting, the URL constructor, system theme detection, or native dialogs use built-in fallbacks; no external polyfill download is needed. Older remote controls that report numeric key codes are also supported.

Browsers without CSS Grid use a simplified layout. Browsers without CSS custom properties use a fixed dark/orange palette instead of customizable colors. JavaScript must be enabled; if browser storage is blocked, changes cannot be saved between visits. Updating the browser or Android System WebView is still recommended where possible.

### Customization

You can customize TVDash using the Edit Bookmarks menu and the Settings menu accessible via the buttons in the header. Here you can change the search engine, toggle dark mode, and adjust other preferences to suit your needs.

- **Edit Bookmarks**: Add, edit, or remove bookmarks to customize your home page.
- **Appearance**: Choose an orange, blue, purple, or green color theme and enable or disable dark mode.
- **Default focus**: Choose whether the search bar or Downloader code box receives focus when the page opens. The Downloader code box is selected by default.
- **Date & Time**: Toggle the 24-hour clock and choose long day-first, long month-first, or year-first (YYYY-MM-DD) dates. Previews show today's date, and changes are saved in your browser.
- **Search Engine**: Choose which search engines to enable for use in the search bar. If multiple are enabled, you can select the desired one from a dropdown menu in the search bar.

#### Supported Search Engines

- **Google** - Standard web search using Google.
- **DuckDuckGo** - Privacy-focused search engine.
- **Brave** - Privacy-focused search engine by the Brave browser.
- **Qwant** - Privacy-focused search engine based in France.
- **Bing** - Standard web search using Microsoft Bing.
- **Startpage** - Privacy-focused search engine based in the Netherlands.
- **Ecosia** - Search engine that plants trees with its ad revenue.

## Contributing

Contributions are welcome. Please open an issue before starting work on large features so that they can be discussed before implementation.

After changing `assets/app.js` or `assets/styles.css`, run `node scripts/version-assets.js` and include the updated `index.html` in your changes. Pull requests check that the content hashes are current. On pushes to `main`, the workflow also updates and commits any stale hashes.

To run compatibility checks, serve the repository (for example, `python3 -m http.server 8000`) and open `http://localhost:8000/tests/browser-compatibility.html` in a modern browser. The checks exercise the app with modern APIs available, legacy APIs only, partial internationalization support, and blocked storage. This simulates missing APIs, not an actual old browser engine; also test on target devices when available. Keep the scripts shipped to browsers, including the inline theme script, ES5-compatible.

GitHub Actions runs ES5 syntax checks and the compatibility scenarios in headless Chromium on every push and pull request. Only one browser is installed to keep the check fast; external fonts and favicon requests are blocked during testing. To run the same checks locally with Node.js and Python 3 installed:

```sh
npm ci
npx playwright install --with-deps --only-shell chromium
npm test
```
