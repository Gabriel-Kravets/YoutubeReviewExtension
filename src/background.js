"use strict";

import {analyzeVideo} from "./gemini-analysis.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "ANALYZE_VIDEO") {
        return undefined;
    }

    (async () => {
        try {
            const {geminiApiKey} = await chrome.storage.local.get("geminiApiKey");
            const report = await analyzeVideo({
                apiKey: geminiApiKey,
                context: message.context,
                comments: message.comments
            });
            sendResponse({ok: true, report});
        } catch (error) {
            sendResponse({
                ok: false,
                error: error instanceof Error ? error.message : "Gemini analysis failed."
            });
        }
    })();

    return true;
});
