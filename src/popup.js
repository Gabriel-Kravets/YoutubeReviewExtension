"use strict";

const youtubeKeyInput = document.getElementById("youtube-key");
const geminiKeyInput = document.getElementById("gemini-key");
const saveButton = document.getElementById("save");
const statusElement = document.getElementById("status");

chrome.storage.local.get(["youtubeApiKey", "geminiApiKey"], ({youtubeApiKey, geminiApiKey}) => {
    youtubeKeyInput.value = typeof youtubeApiKey === "string" ? youtubeApiKey : "";
    geminiKeyInput.value = typeof geminiApiKey === "string" ? geminiApiKey : "";
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
    const geminiApiKey = geminiKeyInput.value.trim();
    if (!youtubeApiKey || !geminiApiKey) {
        statusElement.textContent = "Both API keys are required.";
        return;
    }
    await chrome.storage.local.set({youtubeApiKey, geminiApiKey});
    statusElement.textContent = "Saved. Open a YouTube video to analyze it.";
});
