"use strict";

const COMMENT_THREADS_API_URL = "https://www.googleapis.com/youtube/v3/commentThreads";
const COMMENTS_API_URL = "https://www.googleapis.com/youtube/v3/comments";
const COMMENT_LIMIT = 50;

const apiKeyInput = document.getElementById("api-key");
const toggleKeyButton = document.getElementById("toggle-key");
const fetchButton = document.getElementById("fetch-comments");
const statusElement = document.getElementById("status");
const resultsElement = document.getElementById("results");
const resultCountElement = document.getElementById("result-count");
const commentListElement = document.getElementById("comment-list");

function getVideoId(rawUrl) {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
        return url.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (host !== "youtube.com" && host !== "m.youtube.com") {
        return null;
    }

    if (url.pathname === "/watch") {
        return url.searchParams.get("v");
    }

    const pathParts = url.pathname.split("/").filter(Boolean);
    if (["shorts", "live", "embed"].includes(pathParts[0])) {
        return pathParts[1] || null;
    }

    return null;
}

function setStatus(message, type = "") {
    statusElement.textContent = message;
    statusElement.className = `status ${type}`.trim();
}

function formatDate(dateString) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium"
    }).format(new Date(dateString));
}

function renderComments(comments) {
    commentListElement.replaceChildren();

    for (const comment of comments) {
        const listItem = document.createElement("li");
        listItem.className = comment.isReply ? "comment reply" : "comment";

        const metadata = document.createElement("div");
        metadata.className = "comment-meta";

        const author = document.createElement("span");
        author.className = "author";
        author.textContent = comment.author;

        if (comment.isReply) {
            const context = document.createElement("span");
            context.className = "reply-context";
            context.textContent = `Reply to ${comment.parentAuthor}`;
            author.append(context);
        }

        const details = document.createElement("span");
        const likeLabel = comment.likeCount === 1 ? "like" : "likes";
        details.textContent = `${comment.likeCount.toLocaleString()} ${likeLabel} · ${formatDate(comment.publishedAt)}`;

        const body = document.createElement("p");
        body.className = "comment-text";
        body.textContent = comment.text;

        metadata.append(author, details);
        listItem.append(metadata, body);
        commentListElement.append(listItem);
    }

    const replyCount = comments.filter((comment) => comment.isReply).length;
    const topLevelCount = comments.length - replyCount;
    resultCountElement.textContent = `${topLevelCount} top-level · ${replyCount} replies`;
    resultsElement.hidden = false;
}

function normalizeComment(item, options = {}) {
    const snippet = item.snippet;

    return {
        id: item.id,
        author: snippet.authorDisplayName || "Unknown author",
        text: snippet.textDisplay || snippet.textOriginal || "",
        likeCount: snippet.likeCount || 0,
        publishedAt: snippet.publishedAt,
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
            throw new Error("The API quota has been reached. Try again after the quota resets.");
        }
        if (response.status === 400 || response.status === 403) {
            throw new Error(`YouTube API rejected the request: ${message}`);
        }
        throw new Error(message);
    }

    return payload;
}

async function getActiveTab() {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    return tab;
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

async function fetchTopComments(videoId, apiKey) {
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
            const replies = await fetchReplies(topLevelComment, apiKey, Math.min(replyCount, remaining));
            comments.push(...replies);
        }
    }

    return comments;
}

async function handleFetch() {
    const apiKey = apiKeyInput.value.trim();
    resultsElement.hidden = true;

    if (!apiKey) {
        setStatus("Enter a YouTube Data API key first.", "error");
        apiKeyInput.focus();
        return;
    }

    fetchButton.disabled = true;
    fetchButton.textContent = "Fetching comments…";
    setStatus("Checking the active YouTube tab…");

    try {
        await chrome.storage.local.set({youtubeApiKey: apiKey});

        const tab = await getActiveTab();
        const videoId = tab?.url ? getVideoId(tab.url) : null;

        if (!videoId) {
            throw new Error("Open a YouTube video, Short, livestream, or youtu.be link and try again.");
        }

        setStatus("Requesting comments and replies from YouTube…");
        const comments = await fetchTopComments(videoId, apiKey);
        renderComments(comments);

        if (comments.length === 0) {
            setStatus("YouTube returned no comments for this video.");
        } else {
            setStatus(`Loaded ${comments.length} comments.`, "success");
        }
    } catch (error) {
        setStatus(error instanceof Error ? error.message : "Something went wrong.", "error");
    } finally {
        fetchButton.disabled = false;
        fetchButton.textContent = "Fetch top 50 comments";
    }
}

toggleKeyButton.addEventListener("click", () => {
    const showing = apiKeyInput.type === "text";
    apiKeyInput.type = showing ? "password" : "text";
    toggleKeyButton.textContent = showing ? "Show" : "Hide";
    toggleKeyButton.setAttribute("aria-label", `${showing ? "Show" : "Hide"} API key`);
});

fetchButton.addEventListener("click", handleFetch);

chrome.storage.local.get("youtubeApiKey", ({youtubeApiKey}) => {
    if (typeof youtubeApiKey === "string") {
        apiKeyInput.value = youtubeApiKey;
    }
});
