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
  async trends(days, end, bucket = "auto") {
    const res = await fetch(`/api/trends?days=${days}&end=${end}&bucket=${bucket}`);
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
  async calendarRange(year, month, months) {
    const res = await fetch(
      `/api/calendar/range?year=${year}&month=${month}&months=${months}`
    );
    if (!res.ok) throw new Error("Failed to load calendar");
    return res.json();
  },
  async bodyReport() {
    const res = await fetch("/api/body/report");
    if (!res.ok) throw new Error("Failed to load body report");
    return res.json();
  },
  async addBody(payload) {
    const res = await fetch("/api/body", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to add measurement");
    return res.json();
  },
};

const BC_SNAPSHOT_ORDER = [
  "skeletal_muscle_lb",
  "weight_lb",
  "body_fat_pct",
  "fat_mass_lb",
];
let bcGoalPopulated = false;

function bcFmt(metric, v) {
  const n = Number(v);
  return metric === "body_fat_pct" ? `${n}%` : `${n} lb`;
}

function bcSigned(v) {
  const n = Number(v);
  return n > 0 ? `+${n}` : `${n}`;
}

function renderBodyComp(report) {
  el("bc-goal-title").textContent = report.goal.label;

  const sel = el("bc-goal-select");
  if (!bcGoalPopulated) {
    sel.innerHTML = "";
    for (const g of report.goals_catalog) {
      const o = document.createElement("option");
      o.value = g.key;
      o.textContent = g.label;
      sel.appendChild(o);
    }
    bcGoalPopulated = true;
  }
  sel.value = report.goal.key;

  const targets = el("bc-targets");
  targets.innerHTML = "";
  for (const key of BC_SNAPSHOT_ORDER) {
    const label = report.goal.target_labels[key];
    if (!label) continue;
    const li = document.createElement("li");
    li.textContent = label;
    targets.appendChild(li);
  }

  const hasData = report.count > 0 && report.latest;
  el("bc-empty").classList.toggle("hidden", hasData);
  el("bc-body").classList.toggle("hidden", !hasData);
  if (!hasData) return;

  // Snapshot metric cards
  const snap = el("bc-snapshot");
  snap.innerHTML = "";
  for (const metric of BC_SNAPSHOT_ORDER) {
    const c = report.changes[metric];
    if (!c) continue;
    const card = document.createElement("div");
    card.className = "bc-metric";
    card.dataset.aligned = String(c.aligned);
    const deltaTxt =
      report.count >= 2
        ? `${c.arrow} ${bcSigned(c.delta_baseline)} ${c.unit === "%" ? "pts" : c.unit} vs baseline`
        : "baseline";
    card.innerHTML = `
      <div class="bc-metric-label"></div>
      <div class="bc-metric-value"></div>
      <div class="bc-metric-delta"></div>
    `;
    card.querySelector(".bc-metric-label").textContent = c.label;
    card.querySelector(".bc-metric-value").textContent = bcFmt(metric, c.value);
    card.querySelector(".bc-metric-delta").textContent = deltaTxt;
    snap.appendChild(card);
  }

  // Trend range header
  const first = report.trend[0];
  const last = report.trend[report.trend.length - 1];
  el("bc-trend-range").textContent =
    report.count >= 2 ? `Trend: ${first.date} → ${last.date}` : "Baseline";

  // Trend rows (metric sequences with an overall arrow)
  const trend = el("bc-trend");
  trend.innerHTML = "";
  for (const metric of BC_SNAPSHOT_ORDER) {
    const c = report.changes[metric];
    const row = document.createElement("div");
    row.className = "bc-trend-row";
    const seq = report.trend.map((t) => Number(t[metric])).join(" → ");
    const label = `${c.label}${c.unit === "%" ? " (%)" : " (lb)"}`;
    row.innerHTML = `
      <span class="bc-trend-label"></span>
      <span class="bc-trend-seq"></span>
      <span class="bc-trend-arrow"></span>
    `;
    row.querySelector(".bc-trend-label").textContent = label;
    row.querySelector(".bc-trend-seq").textContent = seq;
    row.querySelector(".bc-trend-arrow").textContent = c.arrow;
    trend.appendChild(row);
  }

  // Interpretation
  el("bc-interpret").dataset.status = report.status;
  el("bc-headline").textContent = report.headline;
  const notes = el("bc-notes");
  notes.innerHTML = "";
  for (const note of report.notes) {
    const li = document.createElement("li");
    li.textContent = note;
    notes.appendChild(li);
  }
}

const calState = { year: null, month: null, span: 1, metric: "calories", data: null };
const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

const CAL_PALETTE = {
  calories: [
    "rgba(56, 189, 248, 0.22)",
    "rgba(56, 189, 248, 0.42)",
    "rgba(56, 189, 248, 0.66)",
    "rgba(56, 189, 248, 0.92)",
  ],
  activity: [
    "rgba(52, 211, 153, 0.25)",
    "rgba(52, 211, 153, 0.45)",
    "rgba(52, 211, 153, 0.68)",
    "rgba(52, 211, 153, 0.92)",
  ],
};

const CAL_BUDGET_COLORS = {
  under: "rgba(52, 211, 153, 0.85)",
  ontrack: "rgba(52, 211, 153, 0.42)",
  near: "rgba(251, 191, 36, 0.6)",
  over: "rgba(251, 113, 133, 0.72)",
};

function calCellStyle(metric, d, budget) {
  if (metric === "activity") {
    if (!d.earned) return { empty: true };
    const e = d.earned;
    const lvl = e < 150 ? 0 : e < 350 ? 1 : e < 600 ? 2 : 3;
    return { bg: CAL_PALETTE.activity[lvl] };
  }
  if (!d.logged) return { empty: true };
  if (metric === "budget") {
    const b = budget || 1;
    if (d.net <= 0.6 * b) return { bg: CAL_BUDGET_COLORS.under };
    if (d.net <= b) return { bg: CAL_BUDGET_COLORS.ontrack };
    if (d.net <= 1.1 * b) return { bg: CAL_BUDGET_COLORS.near };
    return { bg: CAL_BUDGET_COLORS.over };
  }
  // calories (consumed intensity relative to budget)
  const r = budget > 0 ? d.consumed / budget : 0;
  const lvl = r < 0.5 ? 0 : r < 0.85 ? 1 : r < 1.15 ? 2 : 3;
  return { bg: CAL_PALETTE.calories[lvl] };
}

function renderCalLegend() {
  const legend = el("cal-legend");
  legend.innerHTML = "";
  const swatch = (color) => {
    const s = document.createElement("span");
    s.className = "legend-swatch";
    s.style.background = color;
    return s;
  };
  const label = (text) => {
    const s = document.createElement("span");
    s.textContent = text;
    return s;
  };
  if (calState.metric === "budget") {
    const items = [
      [CAL_BUDGET_COLORS.under, "Under"],
      [CAL_BUDGET_COLORS.ontrack, "On track"],
      [CAL_BUDGET_COLORS.near, "Near"],
      [CAL_BUDGET_COLORS.over, "Over"],
    ];
    const wrap = document.createElement("span");
    wrap.className = "legend-swatches";
    for (const [color, text] of items) {
      const pair = document.createElement("span");
      pair.className = "legend-swatches";
      pair.append(swatch(color), label(text));
      wrap.appendChild(pair);
    }
    legend.appendChild(wrap);
  } else {
    const pal = CAL_PALETTE[calState.metric];
    const wrap = document.createElement("span");
    wrap.className = "legend-swatches";
    pal.forEach((c) => wrap.appendChild(swatch(c)));
    legend.append(label("Less"), wrap, label("More"));
  }
}

function jumpToDate(dateStr) {
  datePicker.value = dateStr;
  syncDateNav();
  window.scrollTo({ top: 0, behavior: "smooth" });
  refresh();
}

function renderMonthBlock(month, today) {
  const block = document.createElement("div");
  block.className = "cal-month";

  const title = document.createElement("div");
  title.className = "cal-month-title";
  title.textContent = `${month.month_name} ${month.year}`;
  block.appendChild(title);

  const wk = document.createElement("div");
  wk.className = "cal-weekdays";
  for (const letter of WEEKDAY_LETTERS) {
    const s = document.createElement("span");
    s.textContent = letter;
    wk.appendChild(s);
  }
  block.appendChild(wk);

  const grid = document.createElement("div");
  grid.className = "cal-grid";
  for (let i = 0; i < month.lead_blanks; i++) {
    const blank = document.createElement("div");
    blank.className = "cal-cell is-blank";
    grid.appendChild(blank);
  }
  for (const d of month.days) {
    const cell = document.createElement("div");
    cell.className = "cal-cell";
    const style = calCellStyle(calState.metric, d, month.daily_budget);
    if (style.empty) {
      cell.classList.add("is-empty");
      cell.dataset.hasData = "false";
    } else {
      cell.style.background = style.bg;
      cell.dataset.hasData = "true";
    }
    if (d.date === today) cell.classList.add("is-today");
    cell.title = d.logged
      ? `${d.date}: ${d.consumed.toLocaleString()} in · ${d.earned.toLocaleString()} out · net ${d.net.toLocaleString()} (click to open)`
      : `${d.date}: no entries (click to open)`;
    cell.addEventListener("click", () => jumpToDate(d.date));
    const num = document.createElement("span");
    num.className = "cal-daynum";
    num.textContent = d.day;
    cell.appendChild(num);
    grid.appendChild(cell);
  }
  block.appendChild(grid);
  return block;
}

function renderCalendar(range) {
  calState.data = range;
  const months = range.data;
  const first = months[0];
  const last = months[months.length - 1];
  el("cal-range-title").textContent =
    months.length === 1
      ? `${last.month_name} ${last.year}`
      : `${first.month_name} ${first.year} – ${last.month_name} ${last.year}`;

  const container = el("cal-months");
  container.classList.toggle("dense", calState.span >= 6);
  container.innerHTML = "";
  const today = todayISO();
  for (const month of months) {
    container.appendChild(renderMonthBlock(month, today));
  }
  renderCalLegend();
}

function shiftMonth(delta) {
  let y = calState.year;
  let m = calState.month + delta;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  calState.year = y;
  calState.month = m;
  loadCalendar();
}

async function loadCalendar() {
  const range = await api.calendarRange(calState.year, calState.month, calState.span);
  renderCalendar(range);
}

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
let trendBucket = "auto";

const el = (id) => document.getElementById(id);
const datePicker = el("date-picker");

function todayISO() {
  const now = new Date();
  const tz = now.getTimezoneOffset() * 60000;
  return new Date(now - tz).toISOString().slice(0, 10);
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate(); // month is 1-based here
}

function populateDateNav() {
  const monthSel = el("sel-month");
  const yearSel = el("sel-year");
  monthSel.innerHTML = "";
  MONTH_NAMES.forEach((name, i) => {
    const o = document.createElement("option");
    o.value = String(i + 1);
    o.textContent = name;
    monthSel.appendChild(o);
  });
  const thisYear = Number(todayISO().slice(0, 4));
  yearSel.innerHTML = "";
  for (let y = thisYear; y >= thisYear - 10; y--) {
    const o = document.createElement("option");
    o.value = String(y);
    o.textContent = String(y);
    yearSel.appendChild(o);
  }
}

function rebuildDayOptions(year, month, keepDay) {
  const daySel = el("sel-day");
  const max = daysInMonth(year, month);
  const target = Math.min(keepDay || 1, max);
  daySel.innerHTML = "";
  for (let d = 1; d <= max; d++) {
    const o = document.createElement("option");
    o.value = String(d);
    o.textContent = String(d);
    daySel.appendChild(o);
  }
  daySel.value = String(target);
  return target;
}

// Reflect the canonical date-picker value into the Month/Day/Year selects.
function syncDateNav() {
  const [y, m, d] = datePicker.value.split("-").map(Number);
  el("sel-year").value = String(y);
  el("sel-month").value = String(m);
  rebuildDayOptions(y, m, d);
}

// Read the three selects into an ISO date and apply it (clamping the day).
function applyDateNav(monthOrYearChanged) {
  const y = Number(el("sel-year").value);
  const m = Number(el("sel-month").value);
  let d = Number(el("sel-day").value);
  if (monthOrYearChanged) d = rebuildDayOptions(y, m, d);
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  datePicker.value = iso;
  // Move the calendar to the chosen month too, so it's easy to look back.
  calState.year = y;
  calState.month = m;
  refresh();
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
    overBudget ? "var(--withdraw)" : "var(--accent)"
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

function renderTrends(data) {
  const anyLogged = data.summary.days_logged > 0;
  // Keep the section and its controls visible; only swap chart/summary for the
  // empty message so the range/granularity toggles stay usable on empty dates.
  el("trend-summary").classList.toggle("hidden", !anyLogged);
  el("trend-chart").classList.toggle("hidden", !anyLogged);
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
    const unit = data.bucket === "day" ? "net kcal" : "avg net/day";
    bar.innerHTML = `
      <div class="bar-fill" style="height:${h.toFixed(1)}%"
           title="${p.label}: ${p.net.toLocaleString()} ${unit}${p.logged ? "" : " (no entries)"}"></div>
      <span class="bar-label">${p.label}</span>
    `;
    chart.appendChild(bar);
  });
}

async function refresh() {
  try {
    const [data, advice, frequent, stats, trend, streakData, cal, bodyRep] =
      await Promise.all([
        api.summary(datePicker.value),
        api.coach(datePicker.value),
        api.frequentFoods(6),
        api.foodStats(5),
        api.trends(trendDays, datePicker.value, trendBucket),
        api.streak(datePicker.value),
        api.calendarRange(calState.year, calState.month, calState.span),
        api.bodyReport(),
      ]);
    render(data);
    renderCoach(advice);
    renderQuickAdd(frequent);
    renderInsights(stats);
    renderTrends(trend);
    renderStreak(streakData);
    renderCalendar(cal);
    renderBodyComp(bodyRep);
  } catch (err) {
    console.error(err);
  }
}

datePicker.value = todayISO();
{
  const [iy, im] = datePicker.value.split("-").map(Number);
  calState.year = iy;
  calState.month = im;
}
populateDateNav();
syncDateNav();
el("bc-date").value = todayISO();

el("bc-goal-select").addEventListener("change", async (e) => {
  await api.updateSettings({ composition_goal: e.target.value });
  await refresh();
});

el("bc-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const weight = parseFloat(el("bc-weight").value);
  const bf = parseFloat(el("bc-bf").value);
  const smm = parseFloat(el("bc-smm").value);
  if ([weight, bf, smm].some((v) => Number.isNaN(v))) return;
  await api.addBody({
    entry_date: el("bc-date").value || todayISO(),
    weight_lb: weight,
    body_fat_pct: bf,
    skeletal_muscle_lb: smm,
  });
  el("bc-weight").value = "";
  el("bc-bf").value = "";
  el("bc-smm").value = "";
  await refresh();
});

el("sel-month").addEventListener("change", () => applyDateNav(true));
el("sel-year").addEventListener("change", () => applyDateNav(true));
el("sel-day").addEventListener("change", () => applyDateNav(false));
el("today-btn").addEventListener("click", () => {
  datePicker.value = todayISO();
  syncDateNav();
  const [y, m] = datePicker.value.split("-").map(Number);
  calState.year = y;
  calState.month = m;
  window.scrollTo({ top: 0, behavior: "smooth" });
  refresh();
});

el("cal-prev").addEventListener("click", () => shiftMonth(-1));
el("cal-next").addEventListener("click", () => shiftMonth(1));
el("cal-metrics").addEventListener("click", (e) => {
  const btn = e.target.closest(".cal-metric-btn");
  if (!btn) return;
  calState.metric = btn.dataset.metric;
  for (const b of el("cal-metrics").querySelectorAll(".cal-metric-btn")) {
    b.classList.toggle("is-active", b === btn);
  }
  if (calState.data) renderCalendar(calState.data);
});

el("cal-spans").addEventListener("click", (e) => {
  const btn = e.target.closest(".cal-span-btn");
  if (!btn) return;
  calState.span = parseInt(btn.dataset.months, 10);
  for (const b of el("cal-spans").querySelectorAll(".cal-span-btn")) {
    b.classList.toggle("is-active", b === btn);
  }
  loadCalendar();
});

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

el("bucket-toggle").addEventListener("click", (e) => {
  const btn = e.target.closest(".range-btn");
  if (!btn) return;
  trendBucket = btn.dataset.bucket;
  for (const b of el("bucket-toggle").querySelectorAll(".range-btn")) {
    b.classList.toggle("is-active", b === btn);
  }
  refresh();
});

refresh();
