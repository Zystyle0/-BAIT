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
  async trends(days, end) {
    const res = await fetch(`/api/trends?days=${days}&end=${end}`);
    if (!res.ok) throw new Error("Failed to load trends");
    return res.json();
  },
  async setFavorite(name, favorite) {
    const res = await fetch("/api/foods/favorite", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, favorite }),
    });
    if (!res.ok) throw new Error("Failed to update favorite");
    return res.json();
  },
  async setTypical(name, calories) {
    const res = await fetch("/api/foods/typical", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, calories }),
    });
    if (!res.ok) throw new Error("Failed to update typical calories");
    return res.json();
  },
  async streak(end) {
    const res = await fetch(`/api/streak?end=${end}`);
    if (!res.ok) throw new Error("Failed to load streak");
    return res.json();
  },
};

const SVG_NS = "http://www.w3.org/2000/svg";

function sparkline(history) {
  const w = 62;
  const h = 20;
  const pad = 2;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "sparkline");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("preserveAspectRatio", "none");
  const data = history || [];
  if (data.length === 0) return svg;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const n = data.length;
  const coords = data.map((v, i) => {
    const x = n === 1 ? w / 2 : pad + (i / (n - 1)) * (w - 2 * pad);
    const y = h - pad - ((v - min) / range) * (h - 2 * pad);
    return [x, y];
  });
  if (n > 1) {
    const pl = document.createElementNS(SVG_NS, "polyline");
    pl.setAttribute("points", coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "));
    svg.appendChild(pl);
  }
  const [lx, ly] = coords[coords.length - 1];
  const dot = document.createElementNS(SVG_NS, "circle");
  dot.setAttribute("cx", lx.toFixed(1));
  dot.setAttribute("cy", ly.toFixed(1));
  dot.setAttribute("r", "1.8");
  svg.appendChild(dot);
  svg.setAttribute("title", `${data.length} recent: ${data.join(", ")} kcal`);
  return svg;
}

function renderStreak(data) {
  const badge = el("streak-badge");
  if (data.streak > 0) {
    el("streak-count").textContent = data.streak;
    el("streak-word").textContent = data.streak === 1 ? "day streak" : "days streak";
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

let trendDays = 7;

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

async function toggleFavorite(name, makeFav) {
  await api.setFavorite(name, makeFav);
  await refresh();
}

function makeStar(food) {
  // A span (not a button) so it is valid markup inside the chip button too.
  const star = document.createElement("span");
  star.className = "fav-star";
  star.setAttribute("role", "button");
  star.setAttribute("tabindex", "0");
  star.dataset.fav = String(food.favorite);
  star.textContent = food.favorite ? "★" : "☆";
  star.title = food.favorite ? "Unpin favorite" : "Pin as favorite";
  const toggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggleFavorite(food.name, !food.favorite);
  };
  star.addEventListener("click", toggle);
  star.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") toggle(e);
  });
  return star;
}

function startTypicalEdit(chip, food) {
  const cals = chip.querySelector(".chip-cals");
  if (!cals || chip.querySelector(".chip-cal-input")) return;
  const input = document.createElement("input");
  input.type = "number";
  input.className = "chip-cal-input";
  input.value = food.typical_calories;
  input.min = "0";
  input.max = "20000";
  let done = false;
  const commit = async (save) => {
    if (done) return;
    done = true;
    if (save) {
      const v = parseInt(input.value, 10);
      if (!Number.isNaN(v)) await api.setTypical(food.name, v);
    }
    await refresh();
  };
  input.addEventListener("click", (e) => e.stopPropagation());
  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      commit(true);
    } else if (e.key === "Escape") {
      commit(false);
    }
  });
  input.addEventListener("blur", () => commit(true));
  cals.replaceWith(input);
  input.focus();
  input.select();
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
    btn.className = "chip" + (food.favorite ? " is-fav" : "");
    const customCls = food.typical_custom ? " is-custom" : "";
    const customTitle = food.typical_custom ? ' title="custom typical calories"' : "";
    btn.innerHTML = `
      <span class="chip-name"></span>
      <span class="chip-cals${customCls}"${customTitle}>${food.typical_calories.toLocaleString()} kcal</span>
      <span class="chip-count">×${food.count}</span>
    `;
    btn.querySelector(".chip-name").textContent = food.name;
    if (food.favorite) {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "chip-edit";
      edit.textContent = "✎";
      edit.title = "Edit typical calories";
      edit.addEventListener("click", (e) => {
        e.stopPropagation();
        startTypicalEdit(btn, food);
      });
      btn.appendChild(edit);
    }
    btn.appendChild(makeStar(food));
    btn.addEventListener("click", () => {
      document.querySelector('input[name="kind"][value="food"]').checked = true;
      el("description").value = food.name;
      el("calories").value = food.typical_calories;
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
    const main = document.createElement("div");
    main.className = "food-main";
    const name = document.createElement("span");
    name.className = "food-name";
    name.textContent = food.name;
    const meta = document.createElement("span");
    meta.className = "food-meta";
    meta.textContent =
      `${food.count} ${times} · avg ${food.avg_calories.toLocaleString()} kcal`;
    main.append(name, meta);
    li.append(main, sparkline(food.history), makeStar(food));
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

function barLabel(dateStr, days, index, total) {
  const d = new Date(dateStr + "T00:00:00");
  if (days <= 10) {
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }
  if (index % 5 === 0 || index === total - 1) return String(d.getDate());
  return "";
}

function renderTrends(data) {
  const anyLogged = data.summary.days_logged > 0;
  el("trends").classList.toggle("hidden", !anyLogged);
  el("trends-empty").classList.toggle("hidden", anyLogged);

  const summary = el("trend-summary");
  summary.innerHTML = "";
  const metrics = [
    ["Avg net / day", anyLogged ? `${data.summary.avg_net.toLocaleString()} kcal` : "—"],
    ["Days logged", `${data.summary.days_logged} / ${data.days}`],
    ["Days over budget", String(data.summary.days_over)],
  ];
  for (const [label, value] of metrics) {
    const m = document.createElement("div");
    m.className = "trend-metric";
    m.innerHTML = `<span class="tm-value"></span><span class="tm-label"></span>`;
    m.querySelector(".tm-value").textContent = value;
    m.querySelector(".tm-label").textContent = label;
    summary.appendChild(m);
  }

  const chart = el("trend-chart");
  chart.innerHTML = "";
  const budget = data.daily_budget;
  // Add headroom so the budget line sits clearly inside the chart (not pinned
  // to the very top) even when nothing exceeds the budget.
  const rawMax = Math.max(budget, ...data.points.map((p) => p.net), 1);
  const chartMax = rawMax * 1.18;
  chart.style.setProperty("--budget-pct", ((budget / chartMax) * 100).toFixed(1));
  data.points.forEach((p, i) => {
    const bar = document.createElement("div");
    bar.className = "trend-bar";
    bar.dataset.over = String(p.over);
    bar.dataset.logged = String(p.logged);
    const h = (Math.max(0, p.net) / chartMax) * 100;
    const label = barLabel(p.date, data.days, i, data.points.length);
    bar.innerHTML = `
      <div class="bar-fill" style="height:${h.toFixed(1)}%"
           title="${p.date}: ${p.net.toLocaleString()} net kcal${p.logged ? "" : " (no entries)"}"></div>
      <span class="bar-label">${label}</span>
    `;
    chart.appendChild(bar);
  });
}

async function refresh() {
  try {
    const [data, advice, frequent, stats, trend, streakData] = await Promise.all([
      api.summary(datePicker.value),
      api.coach(datePicker.value),
      api.frequentFoods(6),
      api.foodStats(5),
      api.trends(trendDays, datePicker.value),
      api.streak(datePicker.value),
    ]);
    render(data);
    renderCoach(advice);
    renderQuickAdd(frequent);
    renderInsights(stats);
    renderTrends(trend);
    renderStreak(streakData);
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

el("range-toggle").addEventListener("click", (e) => {
  const btn = e.target.closest(".range-btn");
  if (!btn) return;
  trendDays = parseInt(btn.dataset.days, 10);
  for (const b of el("range-toggle").querySelectorAll(".range-btn")) {
    b.classList.toggle("is-active", b === btn);
  }
  refresh();
});

refresh();
