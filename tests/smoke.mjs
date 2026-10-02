import assert from "node:assert/strict";
import {fetchTopComments} from "../src/comment-service.js";
import {parseReport} from "../src/gemini-analysis.js";

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

globalThis.fetch = originalFetch;
console.log("Smoke tests passed");
