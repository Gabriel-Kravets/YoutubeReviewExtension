# AI model analysis branch

This branch owns structured video analysis with Gemini 3.8 Flash.

The background worker receives a public YouTube URL, video metadata, and up to 50 comments. Gemini uses agentic video understanding to inspect relevant audio, transcript, and visual content, then returns a concise JSON report containing a summary, clickbait probability, normalized sentiment, recurring themes, takeaways, viewer consensus, spoilers, and confidence.

During local development, each user supplies a Gemini API key through the popup. A production release must replace this with a secure backend because secrets embedded in browser extensions can be extracted.
