const API = "http://localhost:8787";

const out = document.getElementById("output");
const verseInput = document.getElementById("verseInput");

async function showState() {
  const res = await fetch(`${API}/state`);
  const data = await res.json();
  out.textContent = JSON.stringify(data, null, 2);
}

document.getElementById("refresh").addEventListener("click", showState);

document.getElementById("runCycle").addEventListener("click", async () => {
  const new_verse = verseInput.value.trim();
  const res = await fetch(`${API}/cycle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_verse })
  });
  const data = await res.json();
  out.textContent = JSON.stringify(data, null, 2);
});

showState();
