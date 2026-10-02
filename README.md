# SpoilIt AI model analysis branch

This branch owns transcription and structured video analysis with OpenAI.

Supadata first retrieves native captions or automatically generates a speech-to-text transcript when captions are missing. GPT-6 Luna receives that transcript, the thumbnail, video metadata, and up to 50 comments, then returns a concise JSON report containing a summary, clickbait probability, normalized sentiment, recurring themes, takeaways, viewer consensus, spoilers, and confidence.

During local development, each user supplies OpenAI and Supadata API keys through the popup. A production release must replace this with a secure backend because secrets embedded in browser extensions can be extracted.
