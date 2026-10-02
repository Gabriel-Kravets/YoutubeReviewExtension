"use strict";

import {fetchTopComments} from "./comment-service.js";
import {analyzeVideo} from "./openai-analysis.js";
import {checkTranscript, startTranscript} from "./transcript-service.js";

function storageGet(keys) {
    return chrome.storage.local.get(keys);
}

async function runAnalysis(context) {
    const {youtubeApiKey, openaiApiKey} = await storageGet(["youtubeApiKey", "openaiApiKey"]);
    if (!youtubeApiKey) {
        throw new Error("Add your YouTube Data API key in Settings first.");
    }
    if (!openaiApiKey) {
        throw new Error("Add your OpenAI API key in Settings first.");
    }
    if (!context?.videoId) {
        throw new Error("Open a YouTube video and try again.");
    }

    const comments = await fetchTopComments(context.videoId, youtubeApiKey);
    const report = await analyzeVideo({apiKey: openaiApiKey, context, comments, transcript: context.transcript});
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
    await chrome.storage.local.set({[`report:v2:${context.videoId}`]: result});
    return result;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "OPEN_SETTINGS") {
        chrome.runtime.openOptionsPage();
        sendResponse({ok: true});
        return false;
    }

    if (message?.type === "START_TRANSCRIPT") {
        (async () => {
            const key = `transcript:${message.context?.videoId}`;
            const stored = await chrome.storage.local.get([key, "supadataApiKey"]);
            if (stored[key]?.text) {
                return {ok: true, status: "completed", transcript: stored[key], cached: true};
            }
            const result = await startTranscript({
                apiKey: stored.supadataApiKey,
                videoUrl: message.context?.url
            });
            if (result.transcript) {
                await chrome.storage.local.set({[key]: result.transcript});
            }
            return {ok: true, ...result};
        })().then(sendResponse).catch((error) => sendResponse({ok: false, error: error.message}));
        return true;
    }

    if (message?.type === "CHECK_TRANSCRIPT") {
        (async () => {
            const {supadataApiKey} = await chrome.storage.local.get("supadataApiKey");
            const result = await checkTranscript({apiKey: supadataApiKey, jobId: message.jobId});
            if (result.transcript && message.videoId) {
                await chrome.storage.local.set({[`transcript:${message.videoId}`]: result.transcript});
            }
            return {ok: true, ...result};
        })().then(sendResponse).catch((error) => sendResponse({ok: false, error: error.message}));
        return true;
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
