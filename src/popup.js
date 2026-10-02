"use strict";

const openaiKeyInput = document.getElementById("openai-key");
const supadataKeyInput = document.getElementById("supadata-key");
const saveButton = document.getElementById("save-key");
const statusElement = document.getElementById("status");

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

saveButton.addEventListener("click", async () => {
    const openaiApiKey = openaiKeyInput.value.trim();
    const supadataApiKey = supadataKeyInput.value.trim();
    if (!openaiApiKey || !supadataApiKey) {
        statusElement.textContent = "Enter both API keys first.";
        return;
    }
    await chrome.storage.local.set({openaiApiKey, supadataApiKey});
    await chrome.storage.local.remove("geminiApiKey");
    statusElement.textContent = "Saved in this browser profile.";
});
