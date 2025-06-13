"use strict";

const STORAGE_KEY = "study-planner-v1";


let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.tasks) && Array.isArray(saved.goals)) return saved;
  } catch (e) { /* ignore corrupted data */ }
  return { tasks: [], goals: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function pad(n) { return String(n).padStart(2, "0"); }
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function monthKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
function parseDateKey(key) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); }
function parseMonthKey(key) { const [y, m] = key.split("-").map(Number); return new Date(y, m - 1, 1); }

function shiftDay(key, days) {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

function shiftMonth(key, months) {
  const d = parseMonthKey(key);
  d.setMonth(d.getMonth() + months);
  return monthKey(d);
}

function formatDate(key) {
  const text = parseDateKey(key).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
  return key === dateKey(new Date()) ? `Today, ${text}` : text;
}

function formatMonth(key) {
  return parseMonthKey(key).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? "pm" : "am"}`;
}


const view = {
  tab: "home",
  date: dateKey(new Date()),
  goalMonth: monthKey(new Date()),
};


const $ = (id) => document.getElementById(id);

function makeItem({ title, done, meta, onToggle, onRemove, removeLabel }) {
  const li = document.createElement("li");
  li.className = "item" + (done ? " done" : "");

  const label = document.createElement("label");
  label.className = "check";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = done;
  input.addEventListener("change", onToggle);
  const box = document.createElement("span");
  box.className = "box";
  const text = document.createElement("span");
  text.className = "label";
  text.textContent = title; 
  label.append(input, box, text);
  li.append(label);

  if (meta) {
    const time = document.createElement("span");
    time.className = "time";
    time.textContent = meta;
    li.append(time);
  }
  if (onRemove) {
    const del = document.createElement("button");
    del.className = "remove";
    del.type = "button";
    del.textContent = "\u00d7";
    del.setAttribute("aria-label", removeLabel);
    del.addEventListener("click", onRemove);
    li.append(del);
  }
  return li;
}

function emptyItem(message) {
  const li = document.createElement("li");
  li.className = "empty";
  li.textContent = message;
  return li;
}


function toggle(collection, id) {
  const item = state[collection].find((x) => x.id === id);
  if (item) { item.done = !item.done; saveState(); render(); }
}

function remove(collection, id) {
  state[collection] = state[collection].filter((x) => x.id !== id);
  saveState();
  render();
}


function renderHome() {
  $("date-title").textContent = formatDate(view.date);
  $("today-btn").hidden = view.date === dateKey(new Date());


  const tasks = state.tasks
    .filter((t) => t.date === view.date)
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

  const done = tasks.filter((t) => t.done).length;
  $("progress-bar").style.width = tasks.length ? `${(done / tasks.length) * 100}%` : "0";
  $("progress-text").textContent = tasks.length ? `${done} of ${tasks.length} done` : "";

  $("task-list").replaceChildren(
    ...(tasks.length
      ? tasks.map((t) => makeItem({
          title: t.title, done: t.done, meta: formatTime(t.time),
          onToggle: () => toggle("tasks", t.id),
          onRemove: () => remove("tasks", t.id),
          removeLabel: `Remove task: ${t.title}`,
        }))
      : [emptyItem("Nothing yet. Tap + to add a task.")])
  );

  const month = view.date.slice(0, 7);
  $("home-month").textContent = formatMonth(month);
  const goals = state.goals.filter((g) => g.month === month);
  $("home-goals").replaceChildren(
    ...(goals.length
      ? goals.map((g) => makeItem({ title: g.title, done: g.done, onToggle: () => toggle("goals", g.id) }))
      : [emptyItem("No monthly goals yet. Add in the Monthly goals tab.")])
  );
}

function renderGoals() {
  $("month-title").textContent = formatMonth(view.goalMonth);
  $("this-month-btn").hidden = view.goalMonth === monthKey(new Date());
  const goals = state.goals.filter((g) => g.month === view.goalMonth);
  $("goal-list").replaceChildren(
    ...(goals.length
      ? goals.map((g) => makeItem({
          title: g.title, done: g.done,
          onToggle: () => toggle("goals", g.id),
          onRemove: () => remove("goals", g.id),
          removeLabel: `Remove goal: ${g.title}`,
        }))
      : [emptyItem("Nothing yet. Tap + to add a goal.")])
  );
}

function render() {
  const onHome = view.tab === "home";
  $("home").hidden = !onHome;
  $("goals").hidden = onHome;
  for (const [id, active] of [["tab-home", onHome], ["tab-goals", !onHome]]) {
    $(id).classList.toggle("active", active);
    $(id).setAttribute("aria-selected", String(active));
  }
  if (onHome) renderHome(); else renderGoals();
}



$("tab-home").addEventListener("click", () => { view.tab = "home"; render(); });
$("tab-goals").addEventListener("click", () => { view.tab = "goals"; render(); });

$("prev-day").addEventListener("click", () => { view.date = shiftDay(view.date, -1); render(); });
$("next-day").addEventListener("click", () => { view.date = shiftDay(view.date, 1); render(); });
$("today-btn").addEventListener("click", () => { view.date = dateKey(new Date()); render(); });

$("prev-month").addEventListener("click", () => { view.goalMonth = shiftMonth(view.goalMonth, -1); render(); });
$("next-month").addEventListener("click", () => { view.goalMonth = shiftMonth(view.goalMonth, 1); render(); });
$("this-month-btn").addEventListener("click", () => { view.goalMonth = monthKey(new Date()); render(); });

// Tasks
$("add-task").addEventListener("click", () => {
  $("task-form").reset();
  $("task-date").value = view.date;
  $("task-dialog").showModal();
  $("task-title").focus();
});

$("task-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = $("task-title").value.trim();
  const date = $("task-date").value;
  if (!title || !date) return;
  state.tasks.push({ id: newId(), title, date, time: $("task-time").value, done: false });
  saveState();
  view.date = date; 
  $("task-dialog").close();
  render();
});

// Goals
$("add-goal").addEventListener("click", () => {
  $("goal-form").reset();
  $("goal-dialog-month").textContent = formatMonth(view.goalMonth);
  $("goal-dialog").showModal();
  $("goal-title").focus();
});

$("goal-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = $("goal-title").value.trim();
  if (!title) return;
  state.goals.push({ id: newId(), title, month: view.goalMonth, done: false });
  saveState();
  $("goal-dialog").close();
  render();
});

document.querySelectorAll("[data-close]").forEach((btn) =>
  btn.addEventListener("click", () => btn.closest("dialog").close())
);

render();
