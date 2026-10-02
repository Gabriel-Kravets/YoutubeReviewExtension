"use strict";

const openaiKeyInput = document.getElementById("openai-key");
const supadataKeyInput = document.getElementById("supadata-key");
const saveButton = document.getElementById("save-key");
const statusElement = document.getElementById("status");
const keyInputs = [openaiKeyInput, supadataKeyInput];
let draftSaveTimer;

function getEnteredKeys() {
    return {
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

chrome.storage.local.get(["openaiApiKey", "supadataApiKey"], ({openaiApiKey, supadataApiKey}) => {
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
    const {openaiApiKey, supadataApiKey} = getEnteredKeys();
    if (!openaiApiKey || !supadataApiKey) {
        statusElement.textContent = "Enter both API keys first.";
        return;
    }
    clearTimeout(draftSaveTimer);
    await saveDraft(false);
    await chrome.storage.local.remove("geminiApiKey");
    statusElement.textContent = "Saved in this browser profile.";
});
