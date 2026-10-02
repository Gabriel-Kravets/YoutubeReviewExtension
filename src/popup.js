"use strict";

const youtubeKeyInput = document.getElementById("youtube-key");
const openaiKeyInput = document.getElementById("openai-key");
const supadataKeyInput = document.getElementById("supadata-key");
const saveButton = document.getElementById("save");
const statusElement = document.getElementById("status");

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

saveButton.addEventListener("click", async () => {
    const youtubeApiKey = youtubeKeyInput.value.trim();
    const openaiApiKey = openaiKeyInput.value.trim();
    const supadataApiKey = supadataKeyInput.value.trim();
    if (!youtubeApiKey || !openaiApiKey || !supadataApiKey) {
        statusElement.textContent = "All three API keys are required.";
        return;
    }
    await chrome.storage.local.set({youtubeApiKey, openaiApiKey, supadataApiKey});
    await chrome.storage.local.remove("geminiApiKey");
    statusElement.textContent = "Saved. Open a YouTube video to analyze it.";
});
