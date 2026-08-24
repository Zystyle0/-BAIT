const api = {
  async summary(date) {
    const res = await fetch(`/api/summary?entry_date=${date}`);
    if (!res.ok) throw new Error("Failed to load summary");
    return res.json();
  },
  async coach(date) {
    const res = await fetch(`/api/coach?entry_date=${date}`);
    if (!res.ok) throw new Error("Failed to load coach");
    return res.json();
  },
  async addEntry(payload) {
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to add entry");
    return res.json();
  },
  async deleteEntry(id) {
    const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error("Failed to delete entry");
  },
  async setBudget(budget) {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily_budget: budget }),
    });
    if (!res.ok) throw new Error("Failed to update budget");
    return res.json();
  },
};

const el = (id) => document.getElementById(id);
const datePicker = el("date-picker");

function todayISO() {
  const now = new Date();
  const tz = now.getTimezoneOffset() * 60000;
  return new Date(now - tz).toISOString().slice(0, 10);
}

function render(data) {
  el("balance-value").textContent = data.balance.toLocaleString();
  el("consumed-value").textContent = data.consumed.toLocaleString();
  el("earned-value").textContent = data.earned.toLocaleString();
  el("budget-input").value = data.daily_budget;

  const ring = el("ring");
  const pct = data.available > 0
    ? Math.min(100, Math.max(0, (data.consumed / data.available) * 100))
    : 100;
  ring.style.setProperty("--pct", pct.toFixed(1));
  const overBudget = data.balance < 0;
  ring.style.setProperty(
    "--ring-color",
    overBudget ? "var(--withdraw)" : "var(--deposit)"
  );
  el("balance-value").style.color = overBudget
    ? "var(--withdraw)"
    : "var(--text)";

  const list = el("entry-list");
  list.innerHTML = "";
  if (!data.entries.length) {
    el("empty-state").classList.remove("hidden");
  } else {
    el("empty-state").classList.add("hidden");
  }
  for (const entry of data.entries) {
    const li = document.createElement("li");
    li.className = "entry-item";
    const isFood = entry.kind === "food";
    li.innerHTML = `
      <span class="entry-icon">${isFood ? "🍔" : "🏃"}</span>
      <div class="entry-body">
        <div class="entry-desc">${escapeHtml(entry.description)}</div>
        <div class="entry-meta">${isFood ? "Withdrawal" : "Deposit"}</div>
      </div>
      <span class="entry-cals ${entry.kind}">${isFood ? "−" : "+"}${entry.calories.toLocaleString()}</span>
      <button class="entry-delete" data-id="${entry.id}" title="Delete">🗑</button>
    `;
    list.appendChild(li);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const BADGE_LABELS = {
  good: "On track",
  warning: "Heads up",
  over: "Over budget",
  empty: "Get started",
};

function renderCoach(advice) {
  el("coach-card").dataset.status = advice.status;
  el("coach-headline").textContent = advice.headline;
  el("coach-badge").textContent = BADGE_LABELS[advice.status] || advice.status;
  el("coach-message").textContent = advice.message;
  const tips = el("coach-tips");
  tips.innerHTML = "";
  for (const tip of advice.tips) {
    const li = document.createElement("li");
    li.textContent = tip;
    tips.appendChild(li);
  }
}

async function refresh() {
  try {
    const [data, advice] = await Promise.all([
      api.summary(datePicker.value),
      api.coach(datePicker.value),
    ]);
    render(data);
    renderCoach(advice);
  } catch (err) {
    console.error(err);
  }
}

datePicker.value = todayISO();
datePicker.addEventListener("change", refresh);

el("entry-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const kind = document.querySelector('input[name="kind"]:checked').value;
  const description = el("description").value.trim();
  const calories = parseInt(el("calories").value, 10);
  if (!description || Number.isNaN(calories)) return;
  await api.addEntry({
    entry_date: datePicker.value,
    kind,
    description,
    calories,
  });
  el("description").value = "";
  el("calories").value = "";
  el("description").focus();
  await refresh();
});

el("entry-list").addEventListener("click", async (e) => {
  const btn = e.target.closest(".entry-delete");
  if (!btn) return;
  await api.deleteEntry(btn.dataset.id);
  await refresh();
});

el("save-budget").addEventListener("click", async () => {
  const budget = parseInt(el("budget-input").value, 10);
  if (Number.isNaN(budget)) return;
  await api.setBudget(budget);
  await refresh();
});

refresh();
