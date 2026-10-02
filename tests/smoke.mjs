import assert from "node:assert/strict";
import {fetchTopComments} from "../src/comment-service.js";
import {buildPrompt, parseReport} from "../src/openai-analysis.js";
import {checkTranscript, startTranscript} from "../src/transcript-service.js";

const comment = (id, text = id) => ({
    id,
    snippet: {
        authorDisplayName: `Author ${id}`,
        textDisplay: text,
        likeCount: 1,
        publishedAt: "2026-01-01T00:00:00Z"
    }
});

const originalFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/commentThreads")) {
        return new Response(JSON.stringify({
            items: [
                {snippet: {topLevelComment: comment("parent-1"), totalReplyCount: 2}},
                {snippet: {topLevelComment: comment("parent-2"), totalReplyCount: 0}}
            ]
        }), {status: 200});
    }
    return new Response(JSON.stringify({
        items: [comment("reply-1"), comment("reply-2")]
    }), {status: 200});
};

const comments = await fetchTopComments("video-id", "api-key");
assert.equal(comments.length, 4);
assert.deepEqual(comments.map(({id, isReply}) => ({id, isReply})), [
    {id: "parent-1", isReply: false},
    {id: "reply-1", isReply: true},
    {id: "reply-2", isReply: true},
    {id: "parent-2", isReply: false}
]);

const report = parseReport(`\`\`\`json
{
  "summary": "A short briefing.",
  "clickbaitProbability": {"score": 140, "reason": "The promise is exaggerated."},
  "sentiment": {"positive": 3, "neutral": 1, "negative": 1, "label": "Positive"},
  "recurringThemes": ["Theme one"],
  "keyTakeaways": ["Takeaway one"],
  "viewerConsensus": "Mostly favorable.",
  "spoilers": ["Reveal one"],
  "confidence": {"score": 80, "reason": "Strong evidence."}
}
\`\`\``);
assert.equal(report.clickbaitProbability.score, 100);
assert.deepEqual(
    [report.sentiment.positive, report.sentiment.neutral, report.sentiment.negative],
    [60, 20, 20]
);

const prompt = buildPrompt({
    context: {title: "Does it work?", description: "A concrete description."},
    transcript: {language: "en", text: "The test works and costs $10."},
    comments: []
});
assert.match(prompt, /VIDEO TITLE:\s*Does it work\?/);
assert.match(prompt, /VIDEO DESCRIPTION:\s*A concrete description\./);
assert.match(prompt, /TRANSCRIPT \(en\):\s*The test works and costs \$10\./);
assert.match(prompt, /You are a video spoiler engine/);

const compactPrompt = buildPrompt({
    context: {title: "A thumbnail video", description: ""},
    transcript: {language: "en", text: "A short transcript."},
    comments: [],
    compact: true
});
assert.match(compactPrompt, /THUMBNAIL PREVIEW MODE/);
assert.match(compactPrompt, /no more than 35 words/);

globalThis.fetch = originalFetch;

globalThis.fetch = async () => new Response(JSON.stringify({
    content: "This is the native caption transcript.",
    lang: "en"
}), {status: 200});
const immediate = await startTranscript({apiKey: "transcript-key", videoUrl: "https://youtu.be/video-id"});
assert.equal(immediate.status, "completed");
assert.equal(immediate.transcript.text, "This is the native caption transcript.");

globalThis.fetch = async () => new Response(JSON.stringify({jobId: "job-1"}), {status: 202});
const generated = await startTranscript({apiKey: "transcript-key", videoUrl: "https://youtu.be/video-id"});
assert.deepEqual(generated, {status: "processing", jobId: "job-1"});

globalThis.fetch = async () => new Response(JSON.stringify({
    status: "completed",
    result: {content: "This transcript was generated from audio.", lang: "en"}
}), {status: 200});
const completed = await checkTranscript({apiKey: "transcript-key", jobId: "job-1"});
assert.equal(completed.status, "completed");
assert.equal(completed.transcript.text, "This transcript was generated from audio.");

globalThis.fetch = originalFetch;
console.log("Smoke tests passed");
