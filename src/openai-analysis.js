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

export function buildPrompt({context, comments = [], transcript, compact = false}) {
    const commentPayload = comments.slice(0, 50).map((comment) => ({
        author: comment.author,
        text: String(comment.text || "").slice(0, 1200),
        likes: comment.likeCount || 0,
        isReply: !!comment.isReply
    }));

    return `You are a video spoiler engine. Your job is to tell the viewer exactly what happens in a YouTube video so they don't need to watch it.

INPUT YOU'LL RECEIVE:

- Video title
- Video description
- Transcript (if available)

RULES:

1. Spoil everything important. Give the actual answers, results, reveals, and conclusions, not teasers. If the title asks a question, answer it in the first line.
2. Be specific. Use real names, numbers, prices, products, steps, timestamps, and outcomes from the transcript and description. Never write vague lines like "the creator discusses several tips" — say what the tips ARE.
3. Anchor to the title and description. Prioritize the content that delivers on what the title promises. Ignore filler, sponsor reads, intros, outros, and "like and subscribe" segments.
4. Be concise. No more than 150 words total. No repeated points. No fluff.
5. If the title is clickbait or the video doesn't deliver on it, say so in one line.

OUTPUT FORMAT:
**The answer:** [One sentence that directly delivers on the title's promise]

**Key points:**

- [Specific point with concrete detail]
- [Specific point with concrete detail]
- [3–5 bullets max]

**Ending/verdict:** [The final result, conclusion, or reveal]

**Clickbait check:** [Delivers / Partially delivers / Doesn't deliver, plus a short reason]

VIDEO TITLE:
${context.title || "Untitled video"}

VIDEO DESCRIPTION:
${context.description || "No description was provided."}

TRANSCRIPT (${transcript?.language || "unknown language"}):
${String(transcript?.text || "No transcript was available.").slice(0, 120000)}

VIEWER COMMENTS (supporting reactions only; do not treat them as ground truth):
${JSON.stringify(commentPayload)}

The extension renders the requested format from structured fields. Return only valid JSON matching this exact transport structure:
{
  "summary": "The answer: one sentence that directly delivers on the title's promise.",
  "clickbaitProbability": {"score": 0, "reason": "Delivers, Partially delivers, or Doesn't deliver — plus a short reason."},
  "sentiment": {"positive": 0, "neutral": 0, "negative": 0, "label": "Positive|Mixed|Neutral|Negative"},
  "recurringThemes": ["Up to three short labels grounded in the transcript"],
  "keyTakeaways": ["Three to five specific key points with concrete detail"],
  "viewerConsensus": "At most one short sentence, only if comments add unique evidence.",
  "spoilers": ["Ending/verdict: the final result, conclusion, or reveal"],
  "confidence": {"score": 0, "reason": "A very short note about transcript coverage."}
}

Keep the combined prose across summary, keyTakeaways, viewerConsensus, spoilers, and clickbait reason within 150 words. Scores are integers from 0 to 100. Sentiment percentages must total 100. Do not include markdown or text outside the JSON.

${compact ? `THUMBNAIL PREVIEW MODE:
- Use the transcript as the primary source of truth.
- Never mention the title, thumbnail, transcript, captions, prompt, inputs, or what they do or do not show.
- Write only about the video's actual subject, actions, facts, result, or conclusion.
- Prefer concrete names, objects, numbers, actions, and outcomes over general descriptions.
- Make the summary one direct sentence of no more than 22 words.
- Return exactly two specific keyTakeaways, each no more than 14 words.
- Keep all combined prose under 55 words.` : ""}`;
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

export async function analyzeVideo({apiKey, context, comments, transcript, compact = false}) {
    if (!apiKey) {
        throw new Error("Add an OpenAI API key in the extension settings first.");
    }

    const content = [{type: "input_text", text: buildPrompt({context, comments, transcript, compact})}];
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
            max_output_tokens: compact ? 600 : 1800
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
