# Spoil It

Spoil It is a Chrome extension that tells viewers exactly what happens in a YouTube video. On the `thumbnail-browsing` branch, viewers can get a short spoiler before opening the video: hover over a thumbnail, click **Spoil**, and decide whether it is worth watching.

Thumbnail previews work across YouTube Home, Search, Subscriptions, and recommendation sidebars. Each compact preview includes:

- a direct answer describing what the video is really about;
- up to three specific takeaways;
- a clickbait probability;
- a link to open the video for the complete report.

The full watch-page report combines the transcript, metadata, thumbnail, and up to 50 relevant comments and replies to show:

- what the video is actually about;
- clickbait probability;
- viewer sentiment and recurring themes;
- useful takeaways, consensus, and key reveals.

The report appears at the top of YouTube's right-hand recommendations column and follows YouTube's light or dark theme automatically.

## Install for local testing

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select the `src` folder from this branch.
4. Open the extension settings and add YouTube Data API, Supadata, and OpenAI API keys.
5. Browse YouTube, hover over a video thumbnail, and click **Spoil**. Open the video for the full report.

The YouTube key must have YouTube Data API v3 enabled. Supadata retrieves native captions and falls back to generated speech-to-text when captions are missing. OpenAI turns the transcript and other evidence into the final briefing. Keys are stored only in the current Chrome profile.

## Privacy and cost behavior

Analysis starts only after the user clicks **Spoil**. Supadata processes the public video URL for transcription; the resulting transcript, thumbnail, and metadata are sent to OpenAI for the compact preview. The full watch-page report also includes fetched comments. Transcripts and completed reports are cached locally per video to avoid duplicate requests.

For a public release, API calls and keys should be moved to a secure backend rather than distributed to extension users.

## Branch architecture

- `comment-scraper`: YouTube comments and replies
- `youtube-integration`: video context and navigation handling
- `ai-model-analysis`: OpenAI analysis pipeline
- `extension-ui`: right-side report panel
- `thumbnail-browsing`: hover-to-spoil thumbnail previews
- `dev`: integrated testing branch
- `main`: stable release branch
