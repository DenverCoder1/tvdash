# TVDash

TV browser home page supporting web search, AFTVnews Downloader codes, a clock, and customizable bookmarks.

<a href="https://tvdash.demolab.com"><img width="800" alt="image" src="https://github.com/user-attachments/assets/f7e915da-861b-4586-8999-ae17cc057ad0" /></a>

## Setup and Usage

Open your browser settings and set your Home Page to **https://tvdash.demolab.com**

### TV Bro Setup

1. Open the TV Bro Settings menu
2. Under 'Main', select 'Home page'
3. Set 'Home page' to 'Custom'
4. In 'Custom home page URL' enter 'https://tvdash.demolab.com'
5. Press enter to save and close the Settings menu

### Customization

You can customize TVDash using the Edit Bookmarks menu and the Settings menu accessible via the buttons in the header. Here you can change the search engine, toggle dark mode, and adjust other preferences to suit your needs.

- **Edit Bookmarks**: Add, edit, or remove bookmarks to customize your home page.
- **Appearance**: Choose an orange, blue, purple, or green color theme and enable or disable dark mode.
- **Default focus**: Choose whether the search bar or Downloader code box receives focus when the page opens. The Downloader code box is selected by default.
- **Date & Time**: Toggle the 24-hour clock and choose long day-first, long month-first, or year-first (YYYY-MM-DD) dates. Previews show today's date, and changes are saved in your browser.
- **Search Engine**: Choose which search engines to enable for use in the search bar. If multiple are enabled, you can select the desired one from a dropdown menu in the search bar.

## Contributing

Contributions are welcome. Please open an issue before starting work on large features so that they can be discussed before implementation.

After changing `assets/app.js` or `assets/styles.css`, run `node .github/scripts/version-assets.js` and include the updated `index.html` in your changes. Pull requests check that the content hashes are current. On pushes to `main`, the workflow also updates and commits any stale hashes.
