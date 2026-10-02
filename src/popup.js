"use strict";

const keyInput = document.getElementById("gemini-key");
const showButton = document.getElementById("show-key");
const saveButton = document.getElementById("save-key");
const statusElement = document.getElementById("status");

chrome.storage.local.get("geminiApiKey", ({geminiApiKey}) => {
    if (typeof geminiApiKey === "string") {
        keyInput.value = geminiApiKey;
    }
});

showButton.addEventListener("click", () => {
    const showing = keyInput.type === "text";
    keyInput.type = showing ? "password" : "text";
    showButton.textContent = showing ? "Show" : "Hide";
});

saveButton.addEventListener("click", async () => {
    const geminiApiKey = keyInput.value.trim();
    if (!geminiApiKey) {
        statusElement.textContent = "Enter a Gemini API key first.";
        return;
    }
    await chrome.storage.local.set({geminiApiKey});
    statusElement.textContent = "Saved in this browser profile.";
});
