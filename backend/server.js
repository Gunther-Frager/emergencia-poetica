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
  return verses
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .map((v) => limitWords(v, 10))
    .slice(0, 20);
}

function maybeReappear(discardFile) {
  if (!discardFile.length) return null;
  const chance = Math.random();
  if (chance > 0.2) return null;
  const idx = Math.floor(Math.random() * discardFile.length);
  return discardFile[idx];
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/state", async (_req, res) => {
  const state = await loadState();
  res.json(state);
});

app.post("/init", async (req, res) => {
  const verses = Array.isArray(req.body.verses) ? req.body.verses : [];
  const normalized = normalizeVerses(verses);
  const state = { cycle: 0, verses: normalized, discard_file: [] };
  await saveState(state);
  res.json({ ok: true, state });
});

app.post("/cycle", async (req, res) => {
  const state = await loadState();
  const { new_verse } = req.body;

  if (!new_verse || typeof new_verse !== "string") {
    return res.status(400).json({ error: "new_verse es requerido" });
  }

  const expansion = limitWords(new_verse, 10);
  state.verses.push(expansion);

  const pruneIdx = Math.floor(Math.random() * state.verses.length);
  const [pruned] = state.verses.splice(pruneIdx, 1);
  state.discard_file.push(pruned);

  const reappeared = maybeReappear(state.discard_file);
  if (reappeared) {
    state.verses.push(reappeared);
  }

  state.verses = normalizeVerses(state.verses);
  state.cycle += 1;

  await saveState(state);

  res.json({
    ok: true,
    cycle: state.cycle,
    expansion,
    pruned,
    reappeared: reappeared || null,
    state,
  });
});

app.listen(8787, () => {
  console.log("Backend local en http://localhost:8787");
});
