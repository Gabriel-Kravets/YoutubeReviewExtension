# YouTube integration branch

This branch owns extraction of public video context from YouTube watch pages.

`src/youtube-context.js` supports standard watch URLs, Shorts, livestreams, embeds, and shortened links. On a watch page it exposes the video ID, canonical URL, title, channel, description, thumbnail, duration, and whether browser caption tracks are detectable.

The content script responds to the `GET_VIDEO_CONTEXT` runtime message and emits a `youtube-review:video-change` document event during YouTube single-page navigation.
