"use strict";

const youtubeKeyInput = document.getElementById("youtube-key");
const openaiKeyInput = document.getElementById("openai-key");
const supadataKeyInput = document.getElementById("supadata-key");
const saveButton = document.getElementById("save");
const statusElement = document.getElementById("status");
const keyInputs = [youtubeKeyInput, openaiKeyInput, supadataKeyInput];
let draftSaveTimer;

function getEnteredKeys() {
    return {
        youtubeApiKey: youtubeKeyInput.value.trim(),
        openaiApiKey: openaiKeyInput.value.trim(),
        supadataApiKey: supadataKeyInput.value.trim()
    };
}

async function saveDraft(announce = true) {
    await chrome.storage.local.set(getEnteredKeys());
    if (announce) {
        statusElement.textContent = "Saved locally.";
    }
}

function scheduleDraftSave() {
    clearTimeout(draftSaveTimer);
    statusElement.textContent = "Saving…";
    draftSaveTimer = setTimeout(() => saveDraft(), 200);
}

chrome.storage.local.get(["youtubeApiKey", "openaiApiKey", "supadataApiKey"], ({youtubeApiKey, openaiApiKey, supadataApiKey}) => {
    youtubeKeyInput.value = typeof youtubeApiKey === "string" ? youtubeApiKey : "";
    openaiKeyInput.value = typeof openaiApiKey === "string" ? openaiApiKey : "";
    supadataKeyInput.value = typeof supadataApiKey === "string" ? supadataApiKey : "";
});

for (const button of document.querySelectorAll(".toggle")) {
    button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.target);
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        button.textContent = showing ? "Show" : "Hide";
    });
}

for (const input of keyInputs) {
    input.addEventListener("input", scheduleDraftSave);
}

window.addEventListener("pagehide", () => {
    clearTimeout(draftSaveTimer);
    void saveDraft(false);
});

saveButton.addEventListener("click", async () => {
    const {youtubeApiKey, openaiApiKey, supadataApiKey} = getEnteredKeys();
    if (!youtubeApiKey || !openaiApiKey || !supadataApiKey) {
        statusElement.textContent = "All three API keys are required.";
        return;
    }
    clearTimeout(draftSaveTimer);
    await saveDraft(false);
    await chrome.storage.local.remove("geminiApiKey");
    statusElement.textContent = "Saved. Hover over a YouTube thumbnail and click Spoil.";
});
