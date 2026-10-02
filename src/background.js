"use strict";

import {fetchTopComments} from "./comment-service.js";
import {analyzeVideo} from "./gemini-analysis.js";

function storageGet(keys) {
    return chrome.storage.local.get(keys);
}

async function runAnalysis(context) {
    const {youtubeApiKey, geminiApiKey} = await storageGet(["youtubeApiKey", "geminiApiKey"]);
    if (!youtubeApiKey) {
        throw new Error("Add your YouTube Data API key in Settings first.");
    }
    if (!geminiApiKey) {
        throw new Error("Add your Gemini API key in Settings first.");
    }
    if (!context?.videoId) {
        throw new Error("Open a YouTube video and try again.");
    }

    const comments = await fetchTopComments(context.videoId, youtubeApiKey);
    const report = await analyzeVideo({apiKey: geminiApiKey, context, comments});
    const replies = comments.filter((comment) => comment.isReply).length;
    const result = {
        report,
        context,
        commentStats: {
            total: comments.length,
            topLevel: comments.length - replies,
            replies
        },
        savedAt: new Date().toISOString()
    };
    await chrome.storage.local.set({[`report:${context.videoId}`]: result});
    return result;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "OPEN_SETTINGS") {
        chrome.runtime.openOptionsPage();
        sendResponse({ok: true});
        return false;
    }

    if (message?.type !== "ANALYZE_VIDEO") {
        return false;
    }

    runAnalysis(message.context)
        .then((result) => sendResponse({ok: true, ...result}))
        .catch((error) => sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "The analysis could not be completed."
        }));
    return true;
});
