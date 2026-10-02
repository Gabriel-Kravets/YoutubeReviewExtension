"use strict";

import {analyzeVideo} from "./openai-analysis.js";
import {checkTranscript, startTranscript} from "./transcript-service.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "START_TRANSCRIPT") {
        (async () => {
            const {supadataApiKey} = await chrome.storage.local.get("supadataApiKey");
            return startTranscript({apiKey: supadataApiKey, videoUrl: message.context?.url});
        })().then((result) => sendResponse({ok: true, ...result})).catch((error) => sendResponse({ok: false, error: error.message}));
        return true;
    }

    if (message?.type === "CHECK_TRANSCRIPT") {
        (async () => {
            const {supadataApiKey} = await chrome.storage.local.get("supadataApiKey");
            return checkTranscript({apiKey: supadataApiKey, jobId: message.jobId});
        })().then((result) => sendResponse({ok: true, ...result})).catch((error) => sendResponse({ok: false, error: error.message}));
        return true;
    }

    if (message?.type !== "ANALYZE_VIDEO") {
        return undefined;
    }

    (async () => {
        try {
            const {openaiApiKey} = await chrome.storage.local.get("openaiApiKey");
            const report = await analyzeVideo({
                apiKey: openaiApiKey,
                context: message.context,
                comments: message.comments,
                transcript: message.transcript
            });
            sendResponse({ok: true, report});
        } catch (error) {
            sendResponse({
                ok: false,
                error: error instanceof Error ? error.message : "OpenAI analysis failed."
            });
        }
    })();

    return true;
});
