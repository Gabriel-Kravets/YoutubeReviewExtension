"use strict";

const COMMENT_THREADS_API_URL = "https://www.googleapis.com/youtube/v3/commentThreads";
const COMMENTS_API_URL = "https://www.googleapis.com/youtube/v3/comments";
const COMMENT_LIMIT = 50;

function normalizeComment(item, options = {}) {
    const snippet = item?.snippet || {};
    return {
        id: item?.id || "",
        author: snippet.authorDisplayName || "Unknown author",
        text: snippet.textDisplay || snippet.textOriginal || "",
        likeCount: snippet.likeCount || 0,
        publishedAt: snippet.publishedAt || "",
        isReply: !!options.isReply,
        parentId: options.parentId || null,
        parentAuthor: options.parentAuthor || ""
    };
}

async function requestYouTube(endpoint, params) {
    const response = await fetch(`${endpoint}?${params}`);
    const payload = await response.json();

    if (!response.ok) {
        const reason = payload.error?.errors?.[0]?.reason;
        const message = payload.error?.message || "YouTube could not return comments.";
        if (reason === "commentsDisabled") {
            throw new Error("Comments are disabled for this video.");
        }
        if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
            throw new Error("The YouTube API quota has been reached. Try again after it resets.");
        }
        if (response.status === 400 || response.status === 403) {
            throw new Error(`YouTube API rejected the request: ${message}`);
        }
        throw new Error(message);
    }

    return payload;
}

async function fetchReplies(parentComment, apiKey, limit) {
    const replies = [];
    let pageToken;

    while (replies.length < limit) {
        const params = new URLSearchParams({
            part: "snippet",
            parentId: parentComment.id,
            maxResults: String(Math.min(100, limit - replies.length)),
            textFormat: "plainText",
            key: apiKey
        });
        if (pageToken) {
            params.set("pageToken", pageToken);
        }

        const payload = await requestYouTube(COMMENTS_API_URL, params);
        replies.push(...(payload.items || []).map((item) => normalizeComment(item, {
            isReply: true,
            parentId: parentComment.id,
            parentAuthor: parentComment.author
        })));

        pageToken = payload.nextPageToken;
        if (!pageToken) {
            break;
        }
    }

    return replies.slice(0, limit);
}

export async function fetchTopComments(videoId, apiKey) {
    if (!videoId || !apiKey) {
        throw new Error("A video ID and YouTube Data API key are required.");
    }

    const params = new URLSearchParams({
        part: "snippet",
        videoId,
        maxResults: String(COMMENT_LIMIT),
        order: "relevance",
        textFormat: "plainText",
        key: apiKey
    });

    const payload = await requestYouTube(COMMENT_THREADS_API_URL, params);
    const comments = [];

    for (const thread of payload.items || []) {
        if (comments.length >= COMMENT_LIMIT) {
            break;
        }

        const topLevelComment = normalizeComment(thread.snippet.topLevelComment);
        comments.push(topLevelComment);

        const replyCount = thread.snippet.totalReplyCount || 0;
        const remaining = COMMENT_LIMIT - comments.length;
        if (replyCount > 0 && remaining > 0) {
            comments.push(...await fetchReplies(topLevelComment, apiKey, Math.min(replyCount, remaining)));
        }
    }

    return comments.slice(0, COMMENT_LIMIT);
}
