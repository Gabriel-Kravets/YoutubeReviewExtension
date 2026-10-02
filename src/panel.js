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
        brand.append(createElement("span", "yr-logo", "S"), createElement("span", "yr-brand-name", "SpoilIt"));
        const status = createElement("span", "yr-status", "Ready");
        status.dataset.role = "status";
        header.append(brand, status);

        const hero = createElement("section", "yr-hero");
        hero.innerHTML = `
            <div class="yr-kicker">AI video briefing</div>
            <h2>Know before you watch.</h2>
            <p>See what the video actually covers and how viewers reacted—without the noise.</p>
        `;

        const action = createElement("button", "yr-analyze", "Analyze this video");
        action.type = "button";
        action.dataset.role = "analyze";
        action.addEventListener("click", () => {
            document.dispatchEvent(new CustomEvent("youtube-review:analyze"));
        });

        const disclosure = createElement("p", "yr-disclosure", "Audio is transcribed first; the transcript, thumbnail, metadata, and comments are analyzed by OpenAI.");

        const loading = createElement("section", "yr-loading");
        loading.dataset.role = "loading";
        loading.setAttribute("aria-live", "polite");
        loading.innerHTML = `
            <div class="yr-orbit"><span></span></div>
            <div><strong>Watching at light speed</strong><p data-role="loading-message">Reading the video and viewer reactions…</p></div>
        `;

        const report = createElement("section", "yr-report");
        report.dataset.role = "report";
        report.innerHTML = `
            <div class="yr-media">
                <img data-role="thumbnail" alt="Video thumbnail">
                <div class="yr-media-overlay"><span data-role="source-label">AI video briefing</span></div>
            </div>
            <div class="yr-report-body">
                <div class="yr-section-label">What it’s really about</div>
                <p class="yr-summary" data-role="summary"></p>

                <div class="yr-score-grid">
                    <article class="yr-score-card yr-clickbait">
                        <span>Clickbait probability</span>
                        <strong data-role="clickbait-score">—</strong>
                        <div class="yr-meter"><i data-role="clickbait-meter"></i></div>
                        <p data-role="clickbait-reason"></p>
                    </article>
                    <article class="yr-score-card">
                        <span>Viewer mood</span>
                        <strong data-role="sentiment-label">—</strong>
                        <div class="yr-sentiment-bar" data-role="sentiment-bar"></div>
                        <p data-role="sentiment-detail"></p>
                    </article>
                </div>

                <section class="yr-report-section">
                    <div class="yr-section-label">Recurring themes</div>
                    <div class="yr-chips" data-role="themes"></div>
                </section>

                <section class="yr-report-section">
                    <div class="yr-section-label">The useful bits</div>
                    <ul class="yr-takeaways" data-role="takeaways"></ul>
                </section>

                <section class="yr-quote-card">
                    <span>Viewer consensus</span>
                    <p data-role="consensus"></p>
                </section>

                <details class="yr-spoilers">
                    <summary>Spoilers & key reveals <span>Open</span></summary>
                    <ul data-role="spoilers"></ul>
                </details>
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
        footer.append(createElement("span", "", "Analysis by OpenAI"), settings);

        panel.append(header, hero, action, disclosure, loading, report, error, footer);
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
        const labels = {ready: "Ready", loading: "Analyzing", report: "Complete", error: "Needs attention"};
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
        setText("source-label", context.title || "AI video briefing");
        setText("summary", report.summary);
        setText("clickbait-score", `${clickbait}%`);
        panel.querySelector('[data-role="clickbait-meter"]').style.width = `${clickbait}%`;
        setText("clickbait-reason", report.clickbaitProbability?.reason);
        setText("sentiment-label", sentiment.label || "Mixed");
        setText("sentiment-detail", `${sentiment.positive || 0}% positive · ${sentiment.neutral || 0}% neutral · ${sentiment.negative || 0}% negative`);
        panel.querySelector('[data-role="sentiment-bar"]').style.setProperty("--positive", `${sentiment.positive || 0}%`);
        panel.querySelector('[data-role="sentiment-bar"]').style.setProperty("--neutral", `${sentiment.neutral || 0}%`);

        const themes = panel.querySelector('[data-role="themes"]');
        themes.replaceChildren();
        for (const theme of report.recurringThemes || []) {
            themes.append(createElement("span", "", theme));
        }

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
