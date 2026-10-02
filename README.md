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
4. Open the extension settings and add YouTube Data API, Supadata, and OpenAI API keys.
5. Open a public YouTube video and click **Analyze this video**.

The YouTube key must have YouTube Data API v3 enabled. Supadata retrieves native captions and falls back to generated speech-to-text when captions are missing. OpenAI turns the transcript and other evidence into the final briefing. Keys are stored only in the current Chrome profile.

## Privacy and cost behavior

Analysis starts only after the user clicks the button. Supadata processes the public video URL for transcription; the resulting transcript, thumbnail, metadata, and fetched comments are sent to OpenAI. Transcripts and completed reports are cached locally per video to avoid duplicate requests.

For a public release, API calls and keys should be moved to a secure backend rather than distributed to extension users.

## Branch architecture

- `comment-scraper`: YouTube comments and replies
- `youtube-integration`: video context and navigation handling
- `ai-model-analysis`: OpenAI analysis pipeline
- `extension-ui`: right-side report panel
- `dev`: integrated testing branch
- `main`: stable release branch
