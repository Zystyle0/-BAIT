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
  async updateSettings(payload) {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to update settings");
    return res.json();
  },
  async frequentFoods(limit = 6) {
    const res = await fetch(`/api/foods/frequent?limit=${limit}`);
    if (!res.ok) throw new Error("Failed to load frequent foods");
    return res.json();
  },
  async foodStats(limit = 5) {
    const res = await fetch(`/api/foods/stats?limit=${limit}`);
    if (!res.ok) throw new Error("Failed to load food stats");
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
  if (advice.goal) el("goal-select").value = advice.goal;
}

function renderQuickAdd(foods) {
  const wrap = el("quick-add");
  const chips = el("food-chips");
  chips.innerHTML = "";
  if (!foods.length) {
    wrap.classList.add("hidden");
    return;
  }
  wrap.classList.remove("hidden");
  for (const food of foods) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.innerHTML = `
      <span class="chip-name"></span>
      <span class="chip-cals">${food.last_calories.toLocaleString()} kcal</span>
      <span class="chip-count">×${food.count}</span>
    `;
    btn.querySelector(".chip-name").textContent = food.name;
    btn.addEventListener("click", () => {
      document.querySelector('input[name="kind"][value="food"]').checked = true;
      el("description").value = food.name;
      el("calories").value = food.last_calories;
      el("calories").focus();
    });
    chips.appendChild(btn);
  }
}

function renderRank(listEl, foods) {
  listEl.innerHTML = "";
  for (const food of foods) {
    const li = document.createElement("li");
    const times = food.count === 1 ? "time" : "times";
    li.innerHTML = `
      <span class="food-name"></span>
      <span class="food-count">${food.count} ${times} · ${food.total_calories.toLocaleString()} kcal</span>
    `;
    li.querySelector(".food-name").textContent = food.name;
    listEl.appendChild(li);
  }
}

function renderInsights(stats) {
  const hasData = stats.total_unique > 0;
  el("insights-empty").classList.toggle("hidden", hasData);
  document.querySelector(".insights-grid").classList.toggle("hidden", !hasData);
  if (!hasData) {
    el("insights-sub").textContent = "";
    return;
  }
  el("insights-sub").textContent =
    `${stats.total_unique} foods · ${stats.total_food_entries} logged all-time`;
  renderRank(el("most-eaten"), stats.most_eaten);
  renderRank(el("least-eaten"), stats.least_eaten);
}

async function refresh() {
  try {
    const [data, advice, frequent, stats] = await Promise.all([
      api.summary(datePicker.value),
      api.coach(datePicker.value),
      api.frequentFoods(6),
      api.foodStats(5),
    ]);
    render(data);
    renderCoach(advice);
    renderQuickAdd(frequent);
    renderInsights(stats);
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
  await api.updateSettings({ daily_budget: budget });
  await refresh();
});

el("goal-select").addEventListener("change", async (e) => {
  await api.updateSettings({ goal: e.target.value });
  await refresh();
});

refresh();
