import { apply, sameTitle } from "./ops.js";

const KEY_STORAGE = "watchlist-key";
const $ = (id) => document.getElementById(id);

let key = readKey();
let items = [];
let isNew = false; // nothing saved under this key yet
let queue = Promise.resolve();
let pending = 0;

function readKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

function rememberKey(value) {
  try {
    if (value) localStorage.setItem(KEY_STORAGE, value);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {}
}

async function request(op, withKey = key) {
  const res = await fetch("/api/list", {
    method: op ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${encodeURIComponent(withKey)}`,
      ...(op && { "content-type": "application/json" }),
    },
    body: op && JSON.stringify(op),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) throw Object.assign(new Error(body.error || "Wrong key"), { locked: true });
  if (!res.ok) throw new Error(body.error || `Server answered ${res.status}`);
  return { items: body, isNew: res.headers.has("x-list-new") };
}

function show(view) {
  $("loading").hidden = view !== "loading";
  $("login").hidden = view !== "login";
  $("list").hidden = view !== "list";
  $("count").hidden = view !== "list";
}

async function load() {
  const asked = key;
  try {
    const fresh = await request(null, asked);
    if (pending || asked !== key) return; // a change went out meanwhile, or the key changed
    ({ items, isNew } = fresh);
    render();
    show("list");
  } catch (err) {
    fail(err);
  }
}

function fail(err) {
  if (err.locked) {
    forgetKey();
    $("login-error").textContent = err.message;
  } else if ($("list").hidden) {
    show("login");
    $("login-error").textContent = `Couldn't load the list: ${err.message}`;
  } else {
    toast(`Couldn't save: ${err.message}`);
  }
}

function forgetKey() {
  rememberKey("");
  key = "";
  items = [];
  isNew = false;
  $("login-error").textContent = "";
  show("login");
  $("key").focus();
}

// Shows the change at once, then saves it; changes go out one after another, in order.
function change(op) {
  const result = apply(items, op);
  if (result.error) return;
  items = result.items;
  render();
  const withKey = key;
  pending++;
  queue = queue
    .then(() => request(op, withKey))
    .then((saved) => {
      if (--pending === 0 && withKey === key) {
        items = saved.items;
        isNew = false;
        render();
      }
    })
    .catch((err) => {
      pending--;
      if (withKey !== key) return;
      fail(err);
      if (!pending && !err.locked) load();
    });
}

function render() {
  const open = items.filter((it) => !it.watched);
  const done = items
    .filter((it) => it.watched)
    .sort((a, b) => (b.watchedAt ?? "").localeCompare(a.watchedAt ?? ""));
  $("todo").replaceChildren(...open.map(row));
  $("done").replaceChildren(...done.map(row));
  $("count").textContent = open.length ? `${open.length} to watch` : "";
  $("empty").hidden = open.length > 0;
  $("empty").textContent = isNew
    ? "There's no list under this key yet. Add something to start one."
    : "Nothing to watch yet.";
  $("watched").hidden = done.length === 0;
  $("done-count").textContent = `(${done.length})`;
}

function row(item) {
  const li = document.createElement("li");
  li.dataset.id = item.id;

  const label = document.createElement("label");
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = item.watched;
  box.addEventListener("change", () => {
    change({ op: "watched", id: item.id, watched: box.checked });
    if (box.checked) toast(`Watched “${item.title}”`, () => change({ op: "watched", id: item.id, watched: false }));
  });
  const title = document.createElement("span");
  title.textContent = item.title;
  label.append(box, title);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove";
  remove.textContent = "×";
  remove.setAttribute("aria-label", `Remove ${item.title}`);
  remove.addEventListener("click", () => {
    const index = items.findIndex((it) => it.id === item.id);
    change({ op: "remove", id: item.id });
    toast(`Removed “${item.title}”`, () => change({ op: "restore", item, index }));
  });

  li.append(label, remove);
  return li;
}

let toastTimer;
function toast(message, undo) {
  const el = $("toast");
  const button = $("toast-undo");
  $("toast-text").textContent = message;
  button.hidden = !undo;
  button.onclick = () => {
    el.classList.remove("show");
    undo();
  };
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), undo ? 6000 : 3500);
}

function flash(id) {
  const li = document.querySelector(`li[data-id="${CSS.escape(id)}"]`);
  if (!li) return;
  li.scrollIntoView({ block: "nearest", behavior: "smooth" });
  li.classList.remove("flash");
  void li.offsetWidth;
  li.classList.add("flash");
}

$("add").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("title");
  const title = input.value.trim();
  if (!title) return;
  const existing = items.find((it) => !it.watched && sameTitle(it.title, title.replace(/\s+/g, " ")));
  if (existing) {
    toast(`“${existing.title}” is already on the list`);
    flash(existing.id);
    return;
  }
  change({ op: "add", id: crypto.randomUUID(), title });
  input.value = "";
});

$("login").addEventListener("submit", async (event) => {
  event.preventDefault();
  const entered = $("key").value;
  $("login-error").textContent = "";
  try {
    const fresh = await request(null, entered);
    key = entered;
    ({ items, isNew } = fresh);
    rememberKey(key);
    $("key").value = "";
    render();
    show("list");
    $("title").focus();
  } catch (err) {
    fail(err);
  }
});

$("switch").addEventListener("click", forgetKey);

// Pick up changes made on another device when coming back to this one.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && key && !pending && !$("list").hidden) load();
});

if (key) load();
else {
  show("login");
  $("key").focus();
}
