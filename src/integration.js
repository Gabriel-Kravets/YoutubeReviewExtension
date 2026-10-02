"use strict";

(() => {
    let activeVideoId = null;
    let loadingTimer = null;

    function sendMessage(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                const error = chrome.runtime.lastError;
                if (error) {
                    reject(new Error(error.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    function stopLoadingMessages() {
        if (loadingTimer) {
            clearInterval(loadingTimer);
            loadingTimer = null;
        }
    }

    function startLoadingMessages() {
        const messages = [
            "Collecting the most relevant comments and replies…",
            "Gemini is reviewing the video, title, and thumbnail…",
            "Comparing the creator’s claims with viewer reactions…",
            "Turning the evidence into a concise briefing…"
        ];
        let index = 0;
        globalThis.YouTubeReviewPanel?.setState("loading", messages[index]);
        loadingTimer = setInterval(() => {
            index = Math.min(index + 1, messages.length - 1);
            globalThis.YouTubeReviewPanel?.setState("loading", messages[index]);
        }, 5000);
    }

    async function loadCachedReport(context) {
        if (!context?.videoId) {
            return;
        }
        const key = `report:${context.videoId}`;
        const stored = await chrome.storage.local.get(key);
        if (stored[key]?.report) {
            globalThis.YouTubeReviewPanel?.renderReport(stored[key].report, context);
        }
    }

    async function analyze() {
        const context = globalThis.YouTubeReviewIntegration?.getVideoContext();
        if (!context) {
            globalThis.YouTubeReviewPanel?.setState("error", "Open a standard YouTube video and try again.");
            return;
        }

        stopLoadingMessages();
        startLoadingMessages();
        try {
            const response = await sendMessage({type: "ANALYZE_VIDEO", context});
            if (!response?.ok) {
                throw new Error(response?.error || "The analysis could not be completed.");
            }
            globalThis.YouTubeReviewPanel?.renderReport(response.report, context);
        } catch (error) {
            globalThis.YouTubeReviewPanel?.setState(
                "error",
                error instanceof Error ? error.message : "The analysis could not be completed."
            );
        } finally {
            stopLoadingMessages();
        }
    }

    function refresh() {
        stopLoadingMessages();
        const context = globalThis.YouTubeReviewIntegration?.getVideoContext();
        if (!context || context.videoId === activeVideoId) {
            return;
        }
        activeVideoId = context.videoId;
        globalThis.YouTubeReviewPanel?.reset();
        loadCachedReport(context).catch(() => {});
    }

    document.addEventListener("youtube-review:analyze", analyze);
    document.addEventListener("youtube-review:settings", () => sendMessage({type: "OPEN_SETTINGS"}).catch(() => {}));
    document.addEventListener("youtube-review:video-change", refresh);
    window.addEventListener("yt-navigate-finish", refresh);
    refresh();
})();
