/**
 * Life Dashboard — script.js
 * Features: Clock/Greeting, Focus Timer, To-Do List, Quick Links,
 *           Custom Name, Light/Dark Mode, Local Storage persistence
 */

'use strict';

/* ============================================================
   CONSTANTS & STATE
   ============================================================ */

const STORAGE_KEYS = {
  theme:  'ld_theme',
  name:   'ld_name',
  todos:  'ld_todos',
  links:  'ld_links',
  sessions: 'ld_sessions',
};

const TIMER_DURATION = 25 * 60; // seconds
const TIMER_CIRCUMFERENCE = 2 * Math.PI * 70; // SVG circle r=70

let state = {
  todos:    [],   // [{ id, text, completed, createdAt }]
  links:    [],   // [{ id, label, url, emoji }]
  filter:   'all',
  timer: {
    remaining: TIMER_DURATION,
    running:   false,
    intervalId: null,
    sessions: 0,
  },
};

/* ============================================================
   UTILITIES
   ============================================================ */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const uid = () => Math.random().toString(36).slice(2, 9);

function pad(n) { return String(n).padStart(2, '0'); }

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function showToast(message, type = 'info') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'opacity .3s, transform .3s';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

/* ============================================================
   THEME
   ============================================================ */

function initTheme() {
  const saved = load(STORAGE_KEYS.theme, 'light');
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  save(STORAGE_KEYS.theme, theme);

  const toggle = $('#theme-toggle');
  if (!toggle) return;
  $$('span', toggle).forEach(s => s.classList.remove('active-theme'));
  const btn = toggle.querySelector(`[data-theme-val="${theme}"]`);
  if (btn) btn.classList.add('active-theme');
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'light' ? 'dark' : 'light');
}

/* ============================================================
   CLOCK & GREETING
   ============================================================ */

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function getGreeting(hour) {
  if (hour < 5)  return { text: 'Good night',    emoji: '🌙' };
  if (hour < 12) return { text: 'Good morning',  emoji: '☀️' };
  if (hour < 17) return { text: 'Good afternoon',emoji: '🌤️' };
  if (hour < 21) return { text: 'Good evening',  emoji: '🌅' };
  return             { text: 'Good night',    emoji: '🌙' };
}

function updateClock() {
  const now   = new Date();
  const h     = now.getHours();
  const m     = now.getMinutes();
  const s     = now.getSeconds();
  const ampm  = h >= 12 ? 'PM' : 'AM';
  const h12   = h % 12 || 12;

  const timeStr = `${pad(h12)}:${pad(m)}:${pad(s)}`;
  const dateStr = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  const { text: greetText, emoji } = getGreeting(h);
  const name = load(STORAGE_KEYS.name, 'Friend');

  const greetEl = $('#hero-greeting');
  const nameEl  = $('#hero-name');
  const timeEl  = $('#hero-time');
  const dateEl  = $('#hero-date');

  if (greetEl) greetEl.textContent = `${emoji} ${greetText},`;
  if (nameEl)  nameEl.textContent  = name;
  if (timeEl)  timeEl.textContent  = `${timeStr} ${ampm}`;
  if (dateEl)  dateEl.textContent  = dateStr;
}

/* ============================================================
   CUSTOM NAME
   ============================================================ */

function initName() {
  const input = $('#name-input');
  const btn   = $('#name-save-btn');
  if (!input || !btn) return;

  input.value = load(STORAGE_KEYS.name, '');

  btn.addEventListener('click', saveName);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') saveName(); });
}

function saveName() {
  const input = $('#name-input');
  const val = input.value.trim();
  if (!val) { showToast('Please enter a name.', 'error'); return; }
  save(STORAGE_KEYS.name, val);
  updateClock();
  showToast(`Welcome, ${val}! 👋`, 'success');
}

/* ============================================================
   FOCUS TIMER
   ============================================================ */

function initTimer() {
  state.timer.sessions = load(STORAGE_KEYS.sessions, 0);
  state.timer.remaining = TIMER_DURATION;
  renderTimer();

  $('#timer-start')?.addEventListener('click', startTimer);
  $('#timer-stop')?.addEventListener('click',  stopTimer);
  $('#timer-reset')?.addEventListener('click', resetTimer);
}

function startTimer() {
  if (state.timer.running) return;
  state.timer.running = true;
  renderTimerControls();

  state.timer.intervalId = setInterval(() => {
    state.timer.remaining--;
    renderTimer();

    if (state.timer.remaining <= 0) {
      clearInterval(state.timer.intervalId);
      state.timer.running = false;
      state.timer.sessions++;
      save(STORAGE_KEYS.sessions, state.timer.sessions);
      renderTimerControls();
      renderTimerSessions();
      showToast('🎉 Focus session complete! Take a break.', 'success');
      playBeep();
    }
  }, 1000);
}

function stopTimer() {
  if (!state.timer.running) return;
  clearInterval(state.timer.intervalId);
  state.timer.running = false;
  renderTimerControls();
}

function resetTimer() {
  clearInterval(state.timer.intervalId);
  state.timer.running = false;
  state.timer.remaining = TIMER_DURATION;
  renderTimer();
  renderTimerControls();
}

function renderTimer() {
  const mins = Math.floor(state.timer.remaining / 60);
  const secs = state.timer.remaining % 60;

  const timeEl   = $('#timer-time');
  const statusEl = $('#timer-status');
  const ring     = $('#timer-ring-progress');

  if (timeEl)   timeEl.textContent   = `${pad(mins)}:${pad(secs)}`;
  if (statusEl) statusEl.textContent = state.timer.running ? 'Focusing' : (state.timer.remaining === TIMER_DURATION ? 'Ready' : 'Paused');

  if (ring) {
    const progress = state.timer.remaining / TIMER_DURATION;
    const offset   = TIMER_CIRCUMFERENCE * (1 - progress);
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = progress > .5 ? 'var(--accent)' :
                        progress > .2 ? 'var(--warn)'    : 'var(--danger)';
  }

  renderTimerSessions();
}

function renderTimerControls() {
  const startBtn = $('#timer-start');
  const stopBtn  = $('#timer-stop');
  if (startBtn) startBtn.disabled = state.timer.running;
  if (stopBtn)  stopBtn.disabled  = !state.timer.running;
}

function renderTimerSessions() {
  const el = $('#timer-sessions');
  if (el) el.innerHTML = `Sessions completed today: <span>${state.timer.sessions}</span>`;
}

function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + 1.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.2);
  } catch {}
}

/* ============================================================
   TO-DO LIST
   ============================================================ */

function initTodos() {
  state.todos = load(STORAGE_KEYS.todos, []);

  const input  = $('#todo-input');
  const addBtn = $('#todo-add-btn');

  addBtn?.addEventListener('click', addTodo);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });

  $$('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      $$('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTodos();
    });
  });

  $('#clear-completed')?.addEventListener('click', clearCompleted);

  renderTodos();
}

function addTodo() {
  const input = $('#todo-input');
  const text  = input.value.trim();

  if (!text) { showToast('Please enter a task.', 'error'); return; }

  // Duplicate check (case-insensitive)
  const duplicate = state.todos.some(t => t.text.toLowerCase() === text.toLowerCase());
  if (duplicate) {
    showToast('This task already exists!', 'error');
    input.select();
    return;
  }

  state.todos.unshift({ id: uid(), text, completed: false, createdAt: Date.now() });
  save(STORAGE_KEYS.todos, state.todos);
  input.value = '';
  input.focus();
  renderTodos();
  showToast('Task added!', 'success');
}

function toggleTodo(id) {
  const todo = state.todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    save(STORAGE_KEYS.todos, state.todos);
    renderTodos();
  }
}

function deleteTodo(id) {
  state.todos = state.todos.filter(t => t.id !== id);
  save(STORAGE_KEYS.todos, state.todos);
  renderTodos();
  showToast('Task deleted.', 'info');
}

function startEditTodo(id) {
  const item = document.querySelector(`[data-todo-id="${id}"]`);
  if (!item) return;

  const textEl  = item.querySelector('.todo-item__text');
  const editBtn = item.querySelector('.todo-item__btn--edit');

  const input = document.createElement('input');
  input.className = 'todo-item__edit-input';
  input.value = textEl.textContent;
  textEl.replaceWith(input);
  input.focus();
  input.select();

  editBtn.className = 'todo-item__btn todo-item__btn--save';
  editBtn.textContent = '💾';
  editBtn.title = 'Save';
  editBtn.onclick = () => saveEditTodo(id, input);

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveEditTodo(id, input);
    if (e.key === 'Escape') renderTodos();
  });
}

function saveEditTodo(id, input) {
  const newText = input.value.trim();
  if (!newText) { showToast('Task cannot be empty.', 'error'); return; }

  // Duplicate check excluding self
  const duplicate = state.todos.some(t => t.id !== id && t.text.toLowerCase() === newText.toLowerCase());
  if (duplicate) { showToast('A task with that name already exists!', 'error'); return; }

  const todo = state.todos.find(t => t.id === id);
  if (todo) {
    todo.text = newText;
    save(STORAGE_KEYS.todos, state.todos);
    renderTodos();
    showToast('Task updated!', 'success');
  }
}

function clearCompleted() {
  const count = state.todos.filter(t => t.completed).length;
  if (!count) { showToast('No completed tasks to clear.', 'info'); return; }
  state.todos = state.todos.filter(t => !t.completed);
  save(STORAGE_KEYS.todos, state.todos);
  renderTodos();
  showToast(`Cleared ${count} completed task${count > 1 ? 's' : ''}.`, 'info');
}

function getFilteredTodos() {
  if (state.filter === 'active')    return state.todos.filter(t => !t.completed);
  if (state.filter === 'completed') return state.todos.filter(t =>  t.completed);
  return state.todos;
}

function renderTodos() {
  const list    = $('#todo-list');
  const statsEl = $('#todo-stats-text');
  if (!list) return;

  const filtered   = getFilteredTodos();
  const total      = state.todos.length;
  const completed  = state.todos.filter(t => t.completed).length;
  const remaining  = total - completed;

  if (statsEl) statsEl.textContent = `${remaining} task${remaining !== 1 ? 's' : ''} remaining`;

  if (filtered.length === 0) {
    list.innerHTML = `
      <li class="todo-empty">
        <span>${state.filter === 'completed' ? '🎉' : '📝'}</span>
        ${state.filter === 'completed'
          ? 'No completed tasks yet.'
          : state.filter === 'active'
            ? 'No active tasks. Great job!'
            : 'No tasks yet. Add one above!'}
      </li>`;
    return;
  }

  list.innerHTML = filtered.map(todo => `
    <li class="todo-item${todo.completed ? ' completed' : ''}" data-todo-id="${todo.id}">
      <button class="todo-item__check" onclick="toggleTodo('${todo.id}')" title="Toggle complete" aria-label="Toggle task">
        ${todo.completed ? '✓' : ''}
      </button>
      <span class="todo-item__text">${escapeHtml(todo.text)}</span>
      <div class="todo-item__actions">
        <button class="todo-item__btn todo-item__btn--edit"
          onclick="startEditTodo('${todo.id}')" title="Edit" aria-label="Edit task">✏️</button>
        <button class="todo-item__btn todo-item__btn--delete"
          onclick="deleteTodo('${todo.id}')" title="Delete" aria-label="Delete task">🗑️</button>
      </div>
    </li>
  `).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================================
   QUICK LINKS
   ============================================================ */

const DEFAULT_LINKS = [
  { id: uid(), label: 'GitHub',    url: 'https://github.com',       emoji: '🐙' },
  { id: uid(), label: 'YouTube',   url: 'https://youtube.com',      emoji: '▶️' },
  { id: uid(), label: 'Google',    url: 'https://google.com',       emoji: '🔍' },
  { id: uid(), label: 'Wikipedia', url: 'https://wikipedia.org',    emoji: '📖' },
];

function initLinks() {
  state.links = load(STORAGE_KEYS.links, DEFAULT_LINKS);

  $('#add-link-btn')?.addEventListener('click', addLink);
  $$('#link-label-input, #link-url-input, #link-emoji-input').forEach(el => {
    el?.addEventListener('keydown', e => { if (e.key === 'Enter') addLink(); });
  });

  renderLinks();
}

function addLink() {
  const labelEl = $('#link-label-input');
  const urlEl   = $('#link-url-input');
  const emojiEl = $('#link-emoji-input');

  const label = labelEl.value.trim();
  let   url   = urlEl.value.trim();
  const emoji = emojiEl.value.trim() || '🔗';

  if (!label || !url) {
    showToast('Please fill in both Name and URL.', 'error');
    return;
  }

  // Auto-prepend https:// if missing
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  try { new URL(url); } catch {
    showToast('Please enter a valid URL.', 'error');
    return;
  }

  // Prevent duplicate URLs
  if (state.links.some(l => l.url === url)) {
    showToast('This link already exists!', 'error');
    return;
  }

  state.links.push({ id: uid(), label, url, emoji });
  save(STORAGE_KEYS.links, state.links);
  labelEl.value = urlEl.value = emojiEl.value = '';
  renderLinks();
  showToast(`${emoji} ${label} added!`, 'success');
}

function deleteLink(id) {
  state.links = state.links.filter(l => l.id !== id);
  save(STORAGE_KEYS.links, state.links);
  renderLinks();
}

function renderLinks() {
  const grid = $('#links-grid');
  if (!grid) return;

  if (state.links.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;grid-column:1/-1;">No links yet. Add one below!</p>`;
    return;
  }

  grid.innerHTML = state.links.map(link => `
    <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer"
       class="link-tile" title="${escapeHtml(link.url)}">
      <button class="link-tile__delete" onclick="event.preventDefault(); deleteLink('${link.id}')"
              aria-label="Remove link">✕</button>
      <span class="link-tile__icon">${link.emoji}</span>
      <span>${escapeHtml(link.label)}</span>
    </a>
  `).join('');
}

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initName();
  initTimer();
  initTodos();
  initLinks();

  updateClock();
  setInterval(updateClock, 1000);

  // Theme toggle buttons
  $('#theme-toggle')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-theme-val]');
    if (btn) applyTheme(btn.dataset.themeVal);
  });
});

// Expose to inline event handlers
window.toggleTodo      = toggleTodo;
window.deleteTodo      = deleteTodo;
window.startEditTodo   = startEditTodo;
window.saveEditTodo    = saveEditTodo;
window.deleteLink      = deleteLink;
