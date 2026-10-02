"use strict";

const TRANSCRIPT_ENDPOINT = "https://api.supadata.ai/v1/transcript";

function normalizeTranscript(payload) {
    const transcript = payload?.result || payload;
    if (typeof transcript?.content === "string") {
        return {
            text: transcript.content.trim(),
            language: transcript.lang || "unknown",
            source: transcript.source || "captions-or-speech-to-text"
        };
    }
    if (Array.isArray(transcript?.content)) {
        return {
            text: transcript.content.map((chunk) => chunk?.text || "").filter(Boolean).join(" ").trim(),
            language: transcript.lang || transcript.content[0]?.lang || "unknown",
            source: transcript.source || "captions-or-speech-to-text"
        };
    }
    return null;
}

async function request(url, apiKey) {
    const response = await fetch(url, {headers: {"x-api-key": apiKey}});
    const payload = await response.json();
    if (!response.ok && response.status !== 202) {
        const message = payload?.details || payload?.message || `Transcription request failed (${response.status}).`;
        throw new Error(message);
    }
    return {response, payload};
}

export async function startTranscript({apiKey, videoUrl}) {
    if (!apiKey) {
        throw new Error("Add a Supadata API key in Settings first.");
    }
    const params = new URLSearchParams({url: videoUrl, text: "true", mode: "auto"});
    const {payload} = await request(`${TRANSCRIPT_ENDPOINT}?${params}`, apiKey);
    const transcript = normalizeTranscript(payload);
    if (transcript?.text) {
        return {status: "completed", transcript};
    }
    if (payload?.jobId) {
        return {status: "processing", jobId: payload.jobId};
    }
    throw new Error("The transcription provider returned no transcript or job ID.");
}

export async function checkTranscript({apiKey, jobId}) {
    const {payload} = await request(`${TRANSCRIPT_ENDPOINT}/${encodeURIComponent(jobId)}`, apiKey);
    if (payload?.status === "failed") {
        throw new Error(payload?.error?.message || payload?.error || "Transcription failed.");
    }
    const transcript = normalizeTranscript(payload);
    if (payload?.status === "completed" && transcript?.text) {
        return {status: "completed", transcript};
    }
    return {status: payload?.status || "processing"};
}
