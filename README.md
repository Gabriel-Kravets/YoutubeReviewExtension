# Preview — AI YouTube Briefings

Preview is a Chrome extension that turns a YouTube video into a concise briefing. It combines the public video, its metadata, and up to 50 relevant comments and replies to show:

- what the video is actually about;
- clickbait probability;
- viewer sentiment and recurring themes;
- useful takeaways, consensus, and key reveals.

The report appears at the top of YouTube's right-hand recommendations column and follows YouTube's light or dark theme automatically.

## Install for local testing

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select the `src` folder from this branch.
4. Open the extension settings and add a YouTube Data API key and a Gemini API key.
5. Open a public YouTube video and click **Analyze this video**.

The YouTube key must have YouTube Data API v3 enabled. The Gemini key can be created in Google AI Studio. Keys are stored only in the current Chrome profile.

## Privacy and cost behavior

Analysis starts only after the user clicks the button. The public video URL, metadata, and fetched comments are sent to Gemini. Completed reports are cached locally per video, but clicking Analyze again requests a fresh report and may incur API usage.

For a public release, API calls and keys should be moved to a secure backend rather than distributed to extension users.

## Branch architecture

- `comment-scraper`: YouTube comments and replies
- `youtube-integration`: video context and navigation handling
- `ai-model-analysis`: Gemini analysis pipeline
- `extension-ui`: right-side report panel
- `dev`: integrated testing branch
- `main`: stable release branch
