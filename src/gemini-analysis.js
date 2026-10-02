"use strict";

export const GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

function cleanArray(value, maximum) {
    return Array.isArray(value)
        ? value.filter((item) => typeof item === "string" && item.trim()).slice(0, maximum).map((item) => item.trim())
        : [];
}

export function buildPrompt({context, comments = []}) {
    const commentPayload = comments.slice(0, 50).map((comment) => ({
        author: comment.author,
        text: String(comment.text || "").slice(0, 1200),
        likes: comment.likeCount || 0,
        isReply: !!comment.isReply
    }));

    return `You are an expert video analyst. Analyze the supplied public YouTube video together with its metadata and viewer comments.

The user wants a fast, honest briefing that reveals what the video actually contains. Be concise and specific. Compare the title and thumbnail promise with the actual video to estimate clickbait. Treat comments as viewer reactions, not ground truth. Do not repeat promotional wording. Mention uncertainty when evidence is limited.

Video metadata:
${JSON.stringify({
        title: context.title,
        channel: context.channel,
        description: context.description,
        durationSeconds: context.durationSeconds,
        thumbnailUrl: context.thumbnailUrl
    })}

Viewer comments:
${JSON.stringify(commentPayload)}

Return only valid JSON matching this exact structure:
{
  "summary": "Two or three short sentences explaining what the video is really about.",
  "clickbaitProbability": {"score": 0, "reason": "One short sentence."},
  "sentiment": {"positive": 0, "neutral": 0, "negative": 0, "label": "Positive|Mixed|Neutral|Negative"},
  "recurringThemes": ["Up to five short themes"],
  "keyTakeaways": ["Three to five useful points or claims"],
  "viewerConsensus": "One or two concise sentences.",
  "spoilers": ["Up to four important reveals or conclusions"],
  "confidence": {"score": 0, "reason": "One short sentence."}
}

Scores are integers from 0 to 100. Sentiment percentages must total 100. Do not include markdown or text outside the JSON.`;
}

export function extractResponseText(payload) {
    if (typeof payload?.output_text === "string") {
        return payload.output_text;
    }
    if (typeof payload?.outputText === "string") {
        return payload.outputText;
    }

    const outputText = payload?.outputs
        ?.flatMap((output) => output?.content?.parts || output?.parts || [])
        .map((part) => part?.text)
        .filter(Boolean)
        .join("");
    if (outputText) {
        return outputText;
    }

    return payload?.candidates
        ?.flatMap((candidate) => candidate?.content?.parts || [])
        .map((part) => part?.text)
        .filter(Boolean)
        .join("") || "";
}

export function parseReport(text) {
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned);
    const sentiment = parsed.sentiment || {};
    const positive = clamp(sentiment.positive, 0, 100);
    const neutral = clamp(sentiment.neutral, 0, 100);
    const negative = clamp(sentiment.negative, 0, 100);
    const total = positive + neutral + negative || 1;
    const normalizedPositive = Math.round(positive * 100 / total);
    const normalizedNeutral = Math.round(neutral * 100 / total);

    return {
        summary: String(parsed.summary || "No summary was returned.").trim(),
        clickbaitProbability: {
            score: Math.round(clamp(parsed.clickbaitProbability?.score, 0, 100)),
            reason: String(parsed.clickbaitProbability?.reason || "").trim()
        },
        sentiment: {
            positive: normalizedPositive,
            neutral: normalizedNeutral,
            negative: Math.max(0, 100 - normalizedPositive - normalizedNeutral),
            label: String(sentiment.label || "Mixed").trim()
        },
        recurringThemes: cleanArray(parsed.recurringThemes, 5),
        keyTakeaways: cleanArray(parsed.keyTakeaways, 5),
        viewerConsensus: String(parsed.viewerConsensus || "Not enough viewer evidence.").trim(),
        spoilers: cleanArray(parsed.spoilers, 4),
        confidence: {
            score: Math.round(clamp(parsed.confidence?.score, 0, 100)),
            reason: String(parsed.confidence?.reason || "").trim()
        }
    };
}

export async function analyzeVideo({apiKey, context, comments}) {
    if (!apiKey) {
        throw new Error("Add a Gemini API key in the extension settings first.");
    }
    if (!context?.url) {
        throw new Error("A public YouTube video URL is required.");
    }

    const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
            model: GEMINI_MODEL,
            input: [
                {
                    type: "video",
                    uri: context.url,
                    processing: "agentic"
                },
                {
                    type: "text",
                    text: buildPrompt({context, comments})
                }
            ]
        })
    });

    const payload = await response.json();
    if (!response.ok) {
        const message = payload?.error?.message || `Gemini request failed (${response.status}).`;
        throw new Error(message);
    }

    const text = extractResponseText(payload);
    if (!text) {
        throw new Error("Gemini returned an empty analysis.");
    }
    return parseReport(text);
}
