import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_PATH = path.join(__dirname, "state.json");

const PORT = Number(process.env.PORT || 8787);
const REAPPEAR_PROBABILITY = Number(process.env.REAPPEAR_PROBABILITY || 0.2);

async function loadState() {
  const raw = await fs.readFile(STATE_PATH, "utf-8");
  return JSON.parse(raw);
}
async function saveState(state) {
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
}

function limitWords(s, max = 10) {
  return String(s).trim().split(/\s+/).slice(0, max).join(" ");
}
function normalizeVerses(verses) {
  return verses.map((v) => limitWords(String(v || "").trim(), 10)).filter(Boolean).slice(0, 20);
}
function maybeReappear(discardFile) {
  if (!discardFile.length || Math.random() > REAPPEAR_PROBABILITY) return null;
  return discardFile[Math.floor(Math.random() * discardFile.length)] || null;
}

function creativePrompt(state) {
  return `Transforma poéticamente el texto-mundo. Solo devuelve texto libre, no JSON.\n\nTexto-mundo:\n${state.verses.join("\n")}\n\nDescartes:\n${state.discard_file.join("\n") || "(vacío)"}`;
}

function structuringPrompt(state, creativeText) {
  return `Convierte a JSON estricto. Sin markdown.\nSchema exacto:\n{"expansion":{"verse":"string<=10 palabras"},"prune":{"target":"string existente en texto-mundo"},"reappearance":{"enabled":true|false,"verse":"string|null"}}\n\nReglas: 1 expansion, 1 prune, max 20 versos, max 10 palabras por verso.\n\nTexto-mundo:\n${state.verses.join("\n")}\n\nDescartes:\n${state.discard_file.join("\n") || "(vacío)"}\n\nSalida creativa:\n${creativeText}`;
}

async function llmGenerate({ provider, prompt }) {
  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("Falta OPENAI_API_KEY");
    const model = process.env.LLM_MODEL_OPENAI || "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, temperature: 0.7, messages: [{ role: "user", content: prompt }] })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${JSON.stringify(data)}`);
    return data?.choices?.[0]?.message?.content || "";
  }

  if (provider === "gemini") {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Falta GEMINI_API_KEY");
    const model = process.env.LLM_MODEL_GEMINI || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${JSON.stringify(data)}`);
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  if (provider === "mock") {
    return '{"expansion":{"verse":"Brilla la bruma sobre vidrio azul"},"prune":{"target":"' + (prompt.includes("Texto-mundo") ? "La noche cae lenta" : "") + '"},"reappearance":{"enabled":false,"verse":null}}';
  }

  throw new Error("Proveedor inválido. Usa openai | gemini | mock");
}

function extractJson(text) {
  const t = String(text || "").trim();
  const i = t.indexOf("{");
  const j = t.lastIndexOf("}");
  return i >= 0 && j > i ? t.slice(i, j + 1) : t;
}

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/state", async (_req, res) => res.json(await loadState()));

app.post("/init", async (req, res) => {
  const verses = normalizeVerses(Array.isArray(req.body.verses) ? req.body.verses : []);
  const state = { cycle: 0, verses, discard_file: [] };
  await saveState(state);
  res.json({ ok: true, state });
});

app.post("/cycle", async (req, res) => {
  try {
    const provider = req.body.provider || process.env.LLM_PROVIDER || "openai";
    const state = await loadState();

    const creativeText = await llmGenerate({ provider, prompt: creativePrompt(state) });
    const structuredRaw = await llmGenerate({ provider, prompt: structuringPrompt(state, creativeText) });

    const action = JSON.parse(extractJson(structuredRaw));
    const expansion = limitWords(action?.expansion?.verse || "", 10);
    const pruneTarget = String(action?.prune?.target || "").trim();

    if (!expansion) return res.status(422).json({ error: "expansion inválida", structuredRaw });
    if (!state.verses.includes(pruneTarget)) return res.status(422).json({ error: "prune.target no existe", structuredRaw });

    state.verses.push(expansion);

    const idx = state.verses.findIndex((v) => v === pruneTarget);
    const [pruned] = idx >= 0 ? state.verses.splice(idx, 1) : [null];
    if (pruned) state.discard_file.push(pruned);

    let reappeared = null;
    if (action?.reappearance?.enabled) {
      const candidate = action?.reappearance?.verse;
      if (state.discard_file.includes(candidate) && !state.verses.includes(candidate)) {
        reappeared = limitWords(candidate, 10);
      }
    }
    if (!reappeared) reappeared = maybeReappear(state.discard_file);
    if (reappeared) state.verses.push(reappeared);

    state.verses = normalizeVerses(state.verses).slice(0, 20);
    state.cycle += 1;

    await saveState(state);
    res.json({ ok: true, provider, cycle: state.cycle, creativeText, action, state });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Backend en http://localhost:${PORT}`));
