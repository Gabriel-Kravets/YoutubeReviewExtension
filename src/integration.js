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
            "Finding captions or generating a transcript from the audio…",
            "Collecting the most relevant comments and replies…",
            "OpenAI is reviewing the transcript, thumbnail, and reactions…",
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

    function wait(milliseconds) {
        return new Promise((resolve) => setTimeout(resolve, milliseconds));
    }

    async function getTranscript(context) {
        let response = await sendMessage({type: "START_TRANSCRIPT", context});
        if (!response?.ok) {
            throw new Error(response?.error || "The video could not be transcribed.");
        }
        if (response.status === "completed") {
            return response.transcript;
        }

        const deadline = Date.now() + 10 * 60 * 1000;
        while (Date.now() < deadline) {
            await wait(2000);
            response = await sendMessage({
                type: "CHECK_TRANSCRIPT",
                jobId: response.jobId,
                videoId: context.videoId
            });
            if (!response?.ok) {
                throw new Error(response?.error || "The video could not be transcribed.");
            }
            if (response.status === "completed") {
                return response.transcript;
            }
        }
        throw new Error("Transcription is taking longer than expected. Please try again later.");
    }

    async function loadCachedReport(context) {
        if (!context?.videoId) {
            return;
        }
        const key = `report:v2:${context.videoId}`;
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
            const transcript = await getTranscript(context);
            const response = await sendMessage({
                type: "ANALYZE_VIDEO",
                context: {...context, transcript}
            });
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
