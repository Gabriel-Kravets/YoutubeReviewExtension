"use strict";

(() => {
    const THUMBNAIL_SELECTOR = [
        'ytd-thumbnail a#thumbnail[href*="/watch"]',
        'yt-thumbnail-view-model a[href*="/watch"]',
        'a#thumbnail[href*="/watch"]',
        'a.yt-lockup-view-model-wiz__content-image[href*="/watch"]',
        'a[href*="/watch"]:has(> yt-thumbnail-view-model)',
        'a[href*="/watch"]:has(ytd-thumbnail)'
    ].join(",");
    const WRAPPER_SELECTOR = "ytd-thumbnail, yt-thumbnail-view-model";
    const CARD_SELECTOR = [
        "ytd-rich-item-renderer",
        "ytd-video-renderer",
        "ytd-grid-video-renderer",
        "ytd-compact-video-renderer",
        "ytd-playlist-video-renderer",
        "yt-lockup-view-model"
    ].join(",");
    const POLL_DELAY_MS = 1800;
    const MAX_POLLS = 34;
    let popover;
    let activeButton;
    let requestToken = 0;

    function sendMessage(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                resolve(response);
            });
        });
    }

    function getVideoId(rawUrl) {
        try {
            const url = new URL(rawUrl, location.origin);
            return url.pathname === "/watch" ? url.searchParams.get("v") : null;
        } catch {
            return null;
        }
    }

    function getContext(anchor) {
        const videoId = getVideoId(anchor.href);
        if (!videoId) {
            return null;
        }
        const card = anchor.closest(CARD_SELECTOR) || anchor.parentElement;
        const titleElement = card?.querySelector("#video-title, a#video-title-link, h3 a, [title]");
        const image = anchor.querySelector("img") || card?.querySelector("img");
        const title = titleElement?.getAttribute("title")?.trim()
            || titleElement?.textContent?.trim()
            || anchor.getAttribute("aria-label")?.trim()
            || "YouTube video";

        return {
            videoId,
            url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
            title,
            channel: card?.querySelector("ytd-channel-name, #channel-name, .yt-content-metadata-view-model-wiz__metadata-row")?.textContent?.trim() || "",
            description: "",
            thumbnailUrl: image?.currentSrc || image?.src || `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`,
            durationSeconds: null,
            captionsDetected: null,
            capturedAt: new Date().toISOString()
        };
    }

    function ensurePopover() {
        if (popover?.isConnected) {
            return popover;
        }
        popover = document.createElement("section");
        popover.className = "ys-popover";
        popover.hidden = true;
        popover.setAttribute("role", "dialog");
        popover.setAttribute("aria-label", "Spoil It thumbnail preview");
        document.body.append(popover);
        return popover;
    }

    function positionPopover(button) {
        const card = ensurePopover();
        const rect = button.getBoundingClientRect();
        const width = Math.min(390, window.innerWidth - 24);
        let left = Math.min(rect.left, window.innerWidth - width - 12);
        left = Math.max(12, left);
        const fitsBelow = rect.bottom + 12 + Math.min(card.offsetHeight || 280, 440) < window.innerHeight;
        card.style.width = `${width}px`;
        card.style.left = `${left}px`;
        card.style.top = fitsBelow ? `${rect.bottom + 10}px` : "auto";
        card.style.bottom = fitsBelow ? "auto" : `${Math.max(12, window.innerHeight - rect.top + 10)}px`;
    }

    function showLoading(button, context) {
        const card = ensurePopover();
        card.hidden = false;
        card.dataset.state = "loading";
        card.innerHTML = `
            <div class="ys-popover-head"><span>Spoil It</span><button type="button" data-close aria-label="Close">×</button></div>
            <h3></h3>
            <div class="ys-loading"><i></i><div><strong>Getting the spoiler</strong><p data-progress>Reading the captions…</p></div></div>
        `;
        card.querySelector("h3").textContent = context.title;
        card.querySelector("[data-close]").addEventListener("click", closePopover);
        positionPopover(button);
    }

    function setProgress(text) {
        const target = popover?.querySelector("[data-progress]");
        if (target) {
            target.textContent = text;
        }
    }

    function renderReport(button, context, report) {
        const card = ensurePopover();
        const points = (report.keyTakeaways || []).slice(0, 3);
        const clickbait = Math.max(0, Math.min(100, Number(report.clickbaitProbability?.score) || 0));
        card.dataset.state = "report";
        card.innerHTML = `
            <div class="ys-popover-head"><span>Spoil It</span><button type="button" data-close aria-label="Close">×</button></div>
            <p class="ys-kicker">What it’s really about</p>
            <h3 data-title></h3>
            <p class="ys-answer" data-answer></p>
            <ul data-points></ul>
            <div class="ys-clickbait"><span>Clickbait</span><strong>${clickbait}%</strong><i><b style="width:${clickbait}%"></b></i></div>
            <a class="ys-full" href="${context.url}">Open video for the full spoiler <span>→</span></a>
        `;
        card.querySelector("[data-title]").textContent = context.title;
        card.querySelector("[data-answer]").textContent = report.summary || "No concise answer was returned.";
        const list = card.querySelector("[data-points]");
        for (const point of points) {
            const item = document.createElement("li");
            item.textContent = point;
            list.append(item);
        }
        list.hidden = !points.length;
        card.querySelector("[data-close]").addEventListener("click", closePopover);
        positionPopover(button);
    }

    function renderError(button, context, message) {
        const card = ensurePopover();
        card.dataset.state = "error";
        card.innerHTML = `
            <div class="ys-popover-head"><span>Spoil It</span><button type="button" data-close aria-label="Close">×</button></div>
            <h3>Couldn’t spoil this video</h3>
            <p class="ys-error-message"></p>
            <div class="ys-error-actions"><button type="button" data-retry>Try again</button><button type="button" data-settings>Settings</button></div>
        `;
        card.querySelector(".ys-error-message").textContent = message;
        card.querySelector("[data-close]").addEventListener("click", closePopover);
        card.querySelector("[data-retry]").addEventListener("click", () => spoil(button, context));
        card.querySelector("[data-settings]").addEventListener("click", () => sendMessage({type: "OPEN_SETTINGS"}));
        positionPopover(button);
    }

    function closePopover() {
        requestToken += 1;
        if (popover) {
            popover.hidden = true;
        }
        activeButton?.removeAttribute("aria-expanded");
        activeButton = null;
    }

    async function waitForTranscript(context, token) {
        const initial = await sendMessage({type: "START_TRANSCRIPT", context});
        if (!initial?.ok) {
            throw new Error(initial?.error || "The transcript could not be retrieved.");
        }
        if (initial.status === "completed") {
            return initial.transcript;
        }
        if (!initial.jobId) {
            throw new Error("The transcription provider did not return a transcript job.");
        }

        for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
            if (token !== requestToken) {
                throw new Error("Preview closed.");
            }
            setProgress(attempt < 2 ? "Listening for the important details…" : "Finishing the transcript…");
            const result = await sendMessage({type: "CHECK_TRANSCRIPT", jobId: initial.jobId, videoId: context.videoId});
            if (!result?.ok) {
                throw new Error(result?.error || "The transcript could not be completed.");
            }
            if (result.status === "completed") {
                return result.transcript;
            }
            if (result.status === "failed") {
                throw new Error("The transcription provider could not process this video.");
            }
        }
        throw new Error("The transcript is taking longer than expected. Try again shortly.");
    }

    async function spoil(button, context) {
        const token = ++requestToken;
        activeButton?.removeAttribute("aria-expanded");
        activeButton = button;
        button.setAttribute("aria-expanded", "true");
        showLoading(button, context);

        try {
            const cacheKey = `thumbnail-report:v1:${context.videoId}`;
            const cached = await chrome.storage.local.get(cacheKey);
            if (cached[cacheKey]?.report) {
                renderReport(button, context, cached[cacheKey].report);
                return;
            }
            const transcript = await waitForTranscript(context, token);
            if (token !== requestToken) {
                return;
            }
            setProgress("Pulling out the useful details…");
            const response = await sendMessage({type: "ANALYZE_THUMBNAIL", context: {...context, transcript}});
            if (!response?.ok) {
                throw new Error(response?.error || "The thumbnail could not be spoiled.");
            }
            if (token === requestToken) {
                renderReport(button, context, response.report);
            }
        } catch (error) {
            if (token === requestToken && error.message !== "Preview closed.") {
                renderError(button, context, error.message);
            }
        }
    }

    function enhance(anchor) {
        const wrapper = anchor.querySelector(WRAPPER_SELECTOR) || anchor.closest(WRAPPER_SELECTOR) || anchor;
        if (wrapper.dataset.ysSpoilReady) {
            return;
        }
        const context = getContext(anchor);
        if (!context) {
            return;
        }
        wrapper.dataset.ysSpoilReady = "true";
        wrapper.classList.add("ys-thumbnail");
        const button = document.createElement("button");
        button.className = "ys-spoil-button";
        button.type = "button";
        button.textContent = "Spoil";
        button.setAttribute("aria-label", `Spoil ${context.title}`);
        button.setAttribute("aria-haspopup", "dialog");
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            spoil(button, getContext(anchor) || context);
        });
        wrapper.append(button);
    }

    function scan(root = document) {
        if (root instanceof Element && root.matches(THUMBNAIL_SELECTOR)) {
            enhance(root);
        }
        root.querySelectorAll?.(THUMBNAIL_SELECTOR).forEach(enhance);
    }

    const observer = new MutationObserver((records) => {
        for (const record of records) {
            for (const node of record.addedNodes) {
                if (node instanceof Element) {
                    scan(node);
                }
            }
        }
    });
    observer.observe(document.documentElement, {childList: true, subtree: true});

    document.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target : event.target?.parentElement;
        if (popover && !popover.hidden && target && !popover.contains(target) && !target.closest(".ys-spoil-button")) {
            closePopover();
        }
    });
    document.addEventListener("pointerover", (event) => {
        const target = event.target instanceof Element ? event.target : event.target?.parentElement;
        const anchor = target?.closest('a[href*="/watch"]');
        if (anchor && (anchor.matches(THUMBNAIL_SELECTOR) || anchor.querySelector("ytd-thumbnail, yt-thumbnail-view-model, img"))) {
            enhance(anchor);
        }
    }, true);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closePopover();
        }
    });
    window.addEventListener("resize", () => activeButton && positionPopover(activeButton));
    window.addEventListener("scroll", () => activeButton && positionPopover(activeButton), true);
    window.addEventListener("yt-navigate-finish", () => scan());
    scan();
})();
