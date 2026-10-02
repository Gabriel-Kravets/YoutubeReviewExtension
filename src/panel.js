"use strict";

(() => {
    const PANEL_ID = "youtube-review-panel";

    function createElement(tag, className, text) {
        const element = document.createElement(tag);
        if (className) {
            element.className = className;
        }
        if (text !== undefined) {
            element.textContent = text;
        }
        return element;
    }

    function createPanel() {
        const panel = createElement("aside", "yr-panel");
        panel.id = PANEL_ID;
        panel.dataset.state = "ready";
        panel.setAttribute("aria-label", "Video review");

        const header = createElement("header", "yr-header");
        const brand = createElement("div", "yr-brand");
        brand.append(createElement("span", "yr-brand-name", "Spoil It"));
        const status = createElement("span", "yr-status", "Ready");
        status.dataset.role = "status";
        header.append(brand, status);

        const hero = createElement("section", "yr-hero");
        hero.innerHTML = `
            <h2>Watch with confidence.</h2>
            <p>See exactly what happens before you spend time watching.</p>
        `;

        const action = createElement("button", "yr-analyze", "Spoil this video");
        action.type = "button";
        action.dataset.role = "analyze";
        action.addEventListener("click", () => {
            document.dispatchEvent(new CustomEvent("youtube-review:analyze"));
        });

        const loading = createElement("section", "yr-loading");
        loading.dataset.role = "loading";
        loading.setAttribute("aria-live", "polite");
        loading.innerHTML = `
            <div class="yr-orbit"><span></span></div>
            <div><strong>Getting the details</strong><p data-role="loading-message">Reading the video and viewer reactions…</p></div>
        `;

        const report = createElement("section", "yr-report");
        report.dataset.role = "report";
        report.innerHTML = `
            <div class="yr-media">
                <img data-role="thumbnail" alt="Video thumbnail">
                <div class="yr-media-overlay">
                    <span class="yr-spoiler-badge">Full spoiler</span>
                    <h2 data-role="video-title"></h2>
                </div>
            </div>
            <div class="yr-report-body">
                <section class="yr-answer-card">
                    <div class="yr-section-label">The answer</div>
                    <p class="yr-summary" data-role="summary"></p>
                </section>

                <section class="yr-detail-card">
                    <div class="yr-section-label">Key points</div>
                    <ul class="yr-takeaways" data-role="takeaways"></ul>
                </section>

                <section class="yr-detail-card yr-verdict-card">
                    <div class="yr-section-label">Ending / verdict</div>
                    <ul class="yr-verdict" data-role="spoilers"></ul>
                </section>

                <section class="yr-detail-card yr-clickbait-card">
                    <div class="yr-card-heading">
                        <div class="yr-section-label">Clickbait check</div>
                        <strong data-role="clickbait-score">—</strong>
                    </div>
                    <div class="yr-meter"><i data-role="clickbait-meter"></i></div>
                    <p data-role="clickbait-reason"></p>
                </section>

                <section class="yr-viewer-card">
                    <div class="yr-card-heading">
                        <div class="yr-section-label">Viewer reaction</div>
                        <strong data-role="sentiment-label">—</strong>
                    </div>
                    <div class="yr-sentiment-bar" data-role="sentiment-bar"></div>
                    <p data-role="sentiment-detail"></p>
                    <p class="yr-consensus" data-role="consensus"></p>
                </section>
            </div>
        `;

        const error = createElement("section", "yr-error");
        error.dataset.role = "error";
        error.innerHTML = `<strong>Analysis couldn’t finish</strong><p data-role="error-message"></p><button type="button" data-role="retry">Try again</button>`;
        error.querySelector('[data-role="retry"]').addEventListener("click", () => action.click());

        const footer = createElement("footer", "yr-footer");
        const settings = createElement("button", "yr-settings", "Settings");
        settings.type = "button";
        settings.addEventListener("click", () => document.dispatchEvent(new CustomEvent("youtube-review:settings")));
        footer.append(settings);

        panel.append(header, hero, action, loading, report, error, footer);
        return panel;
    }

    function findMountTarget() {
        return document.querySelector("#secondary-inner") || document.querySelector("#secondary");
    }

    function mount() {
        if (!location.pathname.startsWith("/watch")) {
            document.getElementById(PANEL_ID)?.remove();
            return null;
        }

        const existing = document.getElementById(PANEL_ID);
        if (existing) {
            return existing;
        }

        const target = findMountTarget();
        if (!target) {
            return null;
        }

        const panel = createPanel();
        target.prepend(panel);
        return panel;
    }

    function setState(state, message = "") {
        const panel = mount();
        if (!panel) {
            return;
        }
        panel.dataset.state = state;
        const labels = {ready: "Ready", loading: "Working", report: "Spoiled", error: "Try again"};
        panel.querySelector('[data-role="status"]').textContent = labels[state] || "Ready";
        if (message) {
            const destination = panel.querySelector(state === "error" ? '[data-role="error-message"]' : '[data-role="loading-message"]');
            if (destination) {
                destination.textContent = message;
            }
        }
    }

    function fillList(container, values) {
        container.replaceChildren();
        for (const value of values || []) {
            container.append(createElement("li", "", value));
        }
    }

    function renderReport(report, context = {}) {
        const panel = mount();
        if (!panel) {
            return;
        }

        const setText = (role, value) => {
            panel.querySelector(`[data-role="${role}"]`).textContent = value ?? "";
        };
        const clickbait = Math.max(0, Math.min(100, Number(report.clickbaitProbability?.score) || 0));
        const sentiment = report.sentiment || {};

        panel.querySelector('[data-role="thumbnail"]').src = context.thumbnailUrl || "";
        setText("video-title", context.title || "YouTube video");
        setText("summary", report.summary);
        setText("clickbait-score", `${clickbait}%`);
        panel.querySelector('[data-role="clickbait-meter"]').style.width = `${clickbait}%`;
        setText("clickbait-reason", report.clickbaitProbability?.reason);
        setText("sentiment-label", sentiment.label || "Mixed");
        setText("sentiment-detail", `${sentiment.positive || 0}% positive · ${sentiment.neutral || 0}% neutral · ${sentiment.negative || 0}% negative`);
        panel.querySelector('[data-role="sentiment-bar"]').style.setProperty("--positive", `${sentiment.positive || 0}%`);
        panel.querySelector('[data-role="sentiment-bar"]').style.setProperty("--neutral", `${sentiment.neutral || 0}%`);

        fillList(panel.querySelector('[data-role="takeaways"]'), report.keyTakeaways);
        setText("consensus", report.viewerConsensus);
        fillList(panel.querySelector('[data-role="spoilers"]'), report.spoilers);
        setState("report");
    }

    function reset() {
        setState("ready");
    }

    const observer = new MutationObserver(() => mount());
    observer.observe(document.documentElement, {childList: true, subtree: true});
    window.addEventListener("yt-navigate-finish", reset);
    mount();

    globalThis.YouTubeReviewPanel = Object.freeze({mount, setState, renderReport, reset});
})();
