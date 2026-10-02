"use strict";

export const OPENAI_MODEL = "gpt-6-luna";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";

function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

function cleanArray(value, maximum) {
    return Array.isArray(value)
        ? value.filter((item) => typeof item === "string" && item.trim()).slice(0, maximum).map((item) => item.trim())
        : [];
}

export function buildPrompt({context, comments = [], transcript}) {
    const commentPayload = comments.slice(0, 50).map((comment) => ({
        author: comment.author,
        text: String(comment.text || "").slice(0, 1200),
        likes: comment.likeCount || 0,
        isReply: !!comment.isReply
    }));

    return `Create a concise, honest YouTube briefing from the supplied transcript, metadata, thumbnail, and viewer comments.

Evidence limits: the transcript represents the spoken audio but may contain speech-recognition errors and does not fully describe visual-only events. Treat the title, description, and thumbnail as creator-supplied claims. Treat comments as reactions, not ground truth. Estimate clickbait by comparing the title and thumbnail promise with the transcript and viewer reactions.

Video metadata:
${JSON.stringify({
        title: context.title,
        channel: context.channel,
        description: context.description,
        durationSeconds: context.durationSeconds,
        captionsDetected: context.captionsDetected
    })}

Viewer comments:
${JSON.stringify(commentPayload)}

Video transcript (${transcript?.language || "unknown language"}):
${String(transcript?.text || "No transcript was available.").slice(0, 120000)}

Return only valid JSON matching this exact structure:
{
  "summary": "Two or three short sentences explaining what the available evidence says the video covers.",
  "clickbaitProbability": {"score": 0, "reason": "One short sentence."},
  "sentiment": {"positive": 0, "neutral": 0, "negative": 0, "label": "Positive|Mixed|Neutral|Negative"},
  "recurringThemes": ["Up to five short themes"],
  "keyTakeaways": ["Three to five useful points or claims"],
  "viewerConsensus": "One or two concise sentences.",
  "spoilers": ["Up to four important reveals or conclusions supported by the evidence"],
  "confidence": {"score": 0, "reason": "Mention transcript coverage and any evidence limits."}
}

Scores are integers from 0 to 100. Sentiment percentages must total 100. Do not include markdown or text outside the JSON.`;
}

export function extractResponseText(payload) {
    if (typeof payload?.output_text === "string") {
        return payload.output_text;
    }
    return (payload?.output || [])
        .flatMap((item) => item?.content || [])
        .map((part) => part?.text)
        .filter(Boolean)
        .join("");
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
            reason: String(parsed.confidence?.reason || "Based on the transcript, metadata, thumbnail, and comments.").trim()
        }
    };
}

export async function analyzeVideo({apiKey, context, comments, transcript}) {
    if (!apiKey) {
        throw new Error("Add an OpenAI API key in the extension settings first.");
    }

    const content = [{type: "input_text", text: buildPrompt({context, comments, transcript})}];
    if (context?.thumbnailUrl) {
        content.push({type: "input_image", image_url: context.thumbnailUrl, detail: "low"});
    }

    const response = await fetch(OPENAI_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            reasoning: {effort: "low"},
            input: [{role: "user", content}],
            max_output_tokens: 1800
        })
    });

    const payload = await response.json();
    if (!response.ok) {
        const message = payload?.error?.message || `OpenAI request failed (${response.status}).`;
        throw new Error(message);
    }

    const text = extractResponseText(payload);
    if (!text) {
        throw new Error("OpenAI returned an empty analysis.");
    }
    return parseReport(text);
}

