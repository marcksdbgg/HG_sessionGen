import { GoogleGenAI } from "@google/genai";

// SECURITY NOTE:
// The API key is obtained exclusively from the environment variable process.env.API_KEY.
// Do NOT hardcode your API key here. If you hardcode it, Google scanners may detect it,
// flag it as leaked, and revoke it, causing 403 errors.

const apiKey = process.env.API_KEY;

if (!apiKey) {
    console.warn("Aula Express: process.env.API_KEY is missing. Session generation will fail.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export { ai };