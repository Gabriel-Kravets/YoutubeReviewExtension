# YouTube Comment Review Extension

This Chrome extension fetches the 50 most relevant top-level comments for the YouTube video open in the active tab. It uses the official YouTube Data API v3 instead of scraping YouTube's page markup.

## Set up a YouTube Data API key

1. Create or select a project in Google Cloud Console.
2. Enable **YouTube Data API v3** for that project.
3. Create an API key under **APIs & Services > Credentials**.
4. For production use, restrict the key to the YouTube Data API and to the extension where possible.

Do not commit an API key to this repository. The extension asks each user for their key and stores it locally in that browser profile.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select the `src` directory.
4. Open a YouTube video and select the extension.
5. Enter the API key and choose **Fetch top 50 comments**.

The popup supports standard watch URLs, Shorts, livestream URLs, embedded-video URLs, and `youtu.be` links.

## API behavior

The extension calls `commentThreads.list` with:

- `part=snippet`
- `order=relevance`
- `maxResults=50`
- `textFormat=plainText`

Only top-level comments are returned. Reply counts are retained in the normalized data, but replies are not fetched because that would require additional API requests and quota.
