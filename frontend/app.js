const API = "http://localhost:8787";
const out = document.getElementById("output");
const providerEl = document.getElementById("provider");

async function showState() {
  const res = await fetch(`${API}/state`);
  out.textContent = JSON.stringify(await res.json(), null, 2);
}

document.getElementById("refresh").addEventListener("click", showState);

document.getElementById("runCycle").addEventListener("click", async () => {
  const provider = providerEl.value;
  const res = await fetch(`${API}/cycle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider })
  });
  out.textContent = JSON.stringify(await res.json(), null, 2);
});

showState();
