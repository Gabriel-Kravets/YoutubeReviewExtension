# Spoil It Privacy Policy

Effective date: October 2, 2026

Spoil It is a Chrome extension that creates concise AI-generated summaries and spoiler reports for YouTube videos. This policy explains what information the extension handles, why it is needed, where it is sent, and how users can delete it.

## Information handled by the extension

Spoil It handles the following information only when needed to provide its video-analysis features:

- API credentials supplied by the user for YouTube Data API, OpenAI, and Supadata.
- The URL and video ID of the YouTube video selected by the user.
- YouTube page content associated with that video, including its title, description, thumbnail, and available metadata.
- Captions or a transcript of the selected video.
- Up to 50 relevant public comments and replies from the selected video.
- AI-generated summaries, spoiler reports, sentiment information, themes, and clickbait assessments.

Spoil It does not collect health information, financial information, precise location, personal communications, or user activity for advertising or analytics.

## How information is used

The information is used only to provide Spoil It's user-facing functionality:

- The YouTube Data API receives the selected video ID and the user's YouTube API key to retrieve public comments and replies.
- Supadata receives the selected YouTube video URL and the user's Supadata API key to retrieve captions or transcribe spoken audio when required.
- OpenAI receives the selected video's title, description, thumbnail, transcript, and up to 50 public comments, together with the user's OpenAI API key, to generate the requested summary and analysis.

These requests are initiated when the user chooses to spoil or analyze a video. Spoil It does not operate an independent developer server and the developer does not receive these requests or API credentials.

## Local storage and retention

API keys, transcripts, and generated reports are stored locally in the user's Chrome extension storage so settings and results remain available between sessions. This information is not synchronized by Spoil It across devices.

Users can delete locally stored information by removing the extension or clearing its extension data in Chrome. Information processed by YouTube, OpenAI, or Supadata is subject to each provider's own terms, retention practices, and privacy policy.

## Sharing and transfers

Spoil It transfers information only to YouTube, OpenAI, and Supadata as necessary to provide the extension's described features. Spoil It does not sell user data, transfer it for advertising, use it to determine creditworthiness, or use it for purposes unrelated to video analysis.

## Security

All requests to YouTube, OpenAI, and Supadata are transmitted over HTTPS. Users are responsible for managing and protecting the API credentials they enter.

## Limited Use disclosure

Spoil It's use and transfer of information received from Google APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements. Data is used only to provide or improve the extension's single user-facing purpose and is not used for personalized advertising.

## Changes to this policy

If Spoil It's data practices change, this policy and the Chrome Web Store disclosures will be updated before the changed practices are released.

## Contact

Questions about this privacy policy may be submitted through the project's public issue tracker: https://github.com/Gabriel-Kravets/YoutubeReviewExtension/issues.
