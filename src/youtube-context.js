"use strict";

(() => {
    function getVideoId(rawUrl = window.location.href) {
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

        const parts = url.pathname.split("/").filter(Boolean);
        return ["shorts", "live", "embed"].includes(parts[0]) ? parts[1] || null : null;
    }

    function textFrom(selectors) {
        for (const selector of selectors) {
            const value = document.querySelector(selector)?.textContent?.trim();
            if (value) {
                return value;
            }
        }
        return "";
    }

    function metaContent(selector) {
        return document.querySelector(selector)?.getAttribute("content")?.trim() || "";
    }

    function getVideoContext() {
        const videoId = getVideoId();
        if (!videoId) {
            return null;
        }

        const video = document.querySelector("video");
        const title = textFrom([
            "ytd-watch-metadata h1 yt-formatted-string",
            "h1.title yt-formatted-string",
            "h1 yt-formatted-string"
        ]) || metaContent('meta[property="og:title"]') || document.title.replace(/\s*-\s*YouTube$/, "");

        return {
            videoId,
            url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
            title,
            channel: textFrom([
                "ytd-watch-metadata ytd-channel-name a",
                "#owner ytd-channel-name a",
                "ytd-channel-name a"
            ]),
            description: metaContent('meta[name="description"]'),
            thumbnailUrl: `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`,
            durationSeconds: Number.isFinite(video?.duration) ? Math.round(video.duration) : null,
            captionsDetected: !!video && Array.from(video.textTracks || []).some((track) => track.kind === "captions" || track.kind === "subtitles"),
            capturedAt: new Date().toISOString()
        };
    }

    let previousVideoId = getVideoId();
    function announceChange() {
        const videoId = getVideoId();
        if (videoId === previousVideoId) {
            return;
        }
        previousVideoId = videoId;
        document.dispatchEvent(new CustomEvent("youtube-review:video-change", {
            detail: getVideoContext()
        }));
    }

    window.addEventListener("yt-navigate-finish", announceChange);
    window.addEventListener("popstate", announceChange);

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type === "GET_VIDEO_CONTEXT") {
            sendResponse({ok: true, context: getVideoContext()});
        }
    });

    globalThis.YouTubeReviewIntegration = Object.freeze({
        getVideoId,
        getVideoContext
    });
})();
