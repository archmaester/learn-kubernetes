/* =============================================
   STATE
   ============================================= */
let state = {
  currentView: "dashboard",
  currentModuleId: null,
  currentTab: "topics",
  completedModules: {},  // { moduleId: true }
  completedTopics: {},   // { "moduleId:topicIdx": true }
  completedLabs: {},     // { "moduleId:labIdx": true }
  theme: "dark",
  highlights: {},        // { "moduleId:lessonId": [{ id, text, color, nth }] }
};

function loadState() {
  try {
    const saved = localStorage.getItem("ai-eng-state");
    if (saved) Object.assign(state, JSON.parse(saved));
  } catch (e) {}
}

function saveState() {
  localStorage.setItem("ai-eng-state", JSON.stringify(state));
}

/* =============================================
   COMPUTED
   ============================================= */
function getAllModules() {
  return CURRICULUM.phases.flatMap(p => p.modules.map(m => ({ ...m, phase: p })));
}

function getModuleById(id) {
  return getAllModules().find(m => m.id === id);
}

function phaseProgress(phase) {
  const total = phase.modules.length;
  const done = phase.modules.filter(m => state.completedModules[m.id]).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

function overallProgress() {
  const all = getAllModules();
  const done = all.filter(m => state.completedModules[m.id]).length;
  return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
}

/* =============================================
   ROUTER / VIEW SWITCHING
   ============================================= */
function showDashboard() {
  state.currentView = "dashboard";
  state.currentModuleId = null;
  document.getElementById("viewDashboard").classList.add("active");
  document.getElementById("viewModule").classList.remove("active");
  document.getElementById("topbarTitle").textContent = "Dashboard";
  updateSidebarActive(null);
  renderDashboard();
}

function showModule(moduleId) {
  state.currentView = "module";
  state.currentModuleId = moduleId;
  state.currentTab = "topics";
  document.getElementById("viewDashboard").classList.remove("active");
  document.getElementById("viewModule").classList.add("active");
  const m = getModuleById(moduleId);
  document.getElementById("topbarTitle").textContent = m.title;
  updateSidebarActive(moduleId);
  renderModuleView(m);
}

/* =============================================
   RENDER SIDEBAR
   ============================================= */
function renderSidebar() {
  const nav = document.getElementById("sidebarNav");
  nav.innerHTML = "";

  // Dashboard link
  const dashItem = document.createElement("div");
  dashItem.className = "nav-item" + (state.currentView === "dashboard" ? " active" : "");
  dashItem.innerHTML = `<span class="nav-icon">🏠</span><span class="nav-item-title">Dashboard</span>`;
  dashItem.addEventListener("click", () => { showDashboard(); closeMobileSidebar(); });
  nav.appendChild(dashItem);

  CURRICULUM.phases.forEach(phase => {
    const phaseEl = document.createElement("div");
    phaseEl.className = "nav-phase";

    const phaseTitle = document.createElement("div");
    phaseTitle.className = "nav-phase-title";
    phaseTitle.textContent = `Phase — Weeks ${phase.weeks}`;
    phaseEl.appendChild(phaseTitle);

    phase.modules.forEach(mod => {
      const item = document.createElement("div");
      item.className = "nav-item" + (state.currentModuleId === mod.id ? " active" : "");
      const isDone = state.completedModules[mod.id];
      item.innerHTML = `
        <span class="nav-icon">${mod.icon}</span>
        <span class="nav-item-title">${mod.title}</span>
        ${isDone ? '<span class="nav-check">✓</span>' : ""}
      `;
      item.addEventListener("click", () => { showModule(mod.id); closeMobileSidebar(); });
      phaseEl.appendChild(item);
    });

    nav.appendChild(phaseEl);
  });

  // Progress bar
  const prog = overallProgress();
  document.getElementById("overallPct").textContent = prog.pct + "%";
  document.getElementById("overallBar").style.width = prog.pct + "%";
}

function updateSidebarActive(moduleId) {
  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  if (!moduleId) {
    document.querySelector(".nav-item")?.classList.add("active");
  } else {
    // re-render is simpler
  }
  renderSidebar();
}

/* =============================================
   RENDER DASHBOARD
   ============================================= */
function renderDashboard() {
  const view = document.getElementById("viewDashboard");
  const prog = overallProgress();
  const allModules = getAllModules();
  const totalLabs = allModules.reduce((s, m) => s + m.labs.length, 0);
  const doneLabs = Object.keys(state.completedLabs).length;
  const totalTopics = allModules.reduce((s, m) => s + m.topics.length, 0);
  const doneTopics = Object.keys(state.completedTopics).length;
  const totalWeeks = CURRICULUM.totalWeeks;

  view.innerHTML = `
    <div class="dash-hero">
      <div class="dash-hero-sub">Your Learning Path</div>
      <div class="dash-hero-title">${CURRICULUM.title}</div>
      <div class="dash-hero-desc">${CURRICULUM.subtitle} &mdash; ${totalWeeks} weeks, fully practical, interview-ready.</div>
    </div>

    <div class="dash-stats">
      <div class="stat-card">
        <div class="stat-value">${prog.done}/${prog.total}</div>
        <div class="stat-label">Modules Complete</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${doneLabs}/${totalLabs}</div>
        <div class="stat-label">Labs Done</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${doneTopics}/${totalTopics}</div>
        <div class="stat-label">Topics Covered</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${prog.pct}%</div>
        <div class="stat-label">Overall Progress</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalWeeks}</div>
        <div class="stat-label">Week Plan</div>
      </div>
    </div>

    <div class="section-title">📚 Phases</div>
    <div class="phases-grid">
      ${CURRICULUM.phases.map(phase => renderPhaseCard(phase)).join("")}
    </div>
  `;

  // Attach click events for module rows
  view.querySelectorAll("[data-module]").forEach(el => {
    el.addEventListener("click", () => showModule(el.dataset.module));
  });
}

function renderPhaseCard(phase) {
  const prog = phaseProgress(phase);
  return `
    <div class="phase-card">
      <div class="phase-card-header">
        <div class="phase-color-dot" style="background:${phase.color}"></div>
        <div class="phase-card-info">
          <div class="phase-card-title">${phase.title}</div>
          <div class="phase-card-weeks">Weeks ${phase.weeks}</div>
        </div>
        <div class="phase-card-progress">
          <div class="phase-card-pct" style="color:${phase.color}">${prog.pct}%</div>
          <div class="phase-card-done">${prog.done}/${prog.total} done</div>
        </div>
      </div>
      <div class="phase-progress-bar">
        <div class="phase-progress-fill" style="width:${prog.pct}%;background:${phase.color}"></div>
      </div>
      <div class="phase-modules">
        ${phase.modules.map(m => `
          <div class="phase-module-item" data-module="${m.id}">
            <span class="phase-module-icon">${m.icon}</span>
            <span class="phase-module-title">${m.title}</span>
            <span class="phase-module-week">${m.week}</span>
            ${state.completedModules[m.id] ? '<span class="phase-module-done">✓</span>' : ''}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

/* =============================================
   RENDER MODULE VIEW
   ============================================= */
function renderModuleView(m) {
  const view = document.getElementById("viewModule");
  const isDone = !!state.completedModules[m.id];
  const hasSd = !!m.systemDesign;

  const hasLearn = !!m.lessons;
  const defaultTab = hasLearn ? "learn" : "topics";

  view.innerHTML = `
    <div class="module-header">
      <div class="module-icon-big">${m.icon}</div>
      <div class="module-header-info">
        <div class="module-phase-badge" style="background:${m.phase.color}">
          ${m.phase.title.split(":")[0]}
        </div>
        <div class="module-title">${m.title}</div>
        <div class="module-meta">
          <span>📅 ${m.week}</span>
          <span>⏱ ${m.duration}</span>
          <span>🔬 ${m.labs.length} labs</span>
          <span>💬 ${m.interviewQuestions.length} interview Qs</span>
          ${hasLearn ? `<span>📖 ${m.lessons.length} lessons</span>` : ""}
        </div>
        <div class="module-desc">${m.description}</div>
      </div>
      <div class="module-actions">
        <button class="btn-complete ${isDone ? "done" : ""}" id="completeBtn">
          ${isDone ? "✓ Completed" : "Mark Complete"}
        </button>
        ${hasSd ? `<button class="btn-sd" id="sdBtn">📐 System Design</button>` : ""}
      </div>
    </div>

    <div class="tabs" id="moduleTabs">
      ${hasLearn ? `<button class="tab active" data-tab="learn">📖 Learn</button>` : ""}
      <button class="tab ${!hasLearn ? "active" : ""}" data-tab="topics">📋 Topics</button>
      <button class="tab" data-tab="labs">🔬 Labs</button>
      <button class="tab" data-tab="resources">🔗 Resources</button>
      <button class="tab" data-tab="interview">💬 Interview Prep</button>
      ${m.codeExamples ? `<button class="tab" data-tab="code">💻 Code Examples</button>` : ""}
    </div>

    ${hasLearn ? `<div class="tab-content active" id="tab-learn"></div>` : ""}

    <div class="tab-content ${!hasLearn ? "active" : ""}" id="tab-topics">
      <div class="topics-grid">
        ${m.topics.map((t, i) => {
          const key = `${m.id}:${i}`;
          const checked = !!state.completedTopics[key];
          return `
            <div class="topic-item ${checked ? "checked" : ""}" data-topic="${key}">
              <span class="topic-check">${checked ? "✅" : "☐"}</span>
              <span>${t}</span>
            </div>
          `;
        }).join("")}
      </div>
    </div>

    <div class="tab-content" id="tab-labs">
      <div class="labs-grid">
        ${m.labs.map((lab, i) => {
          const key = `${m.id}:${i}`;
          const done = !!state.completedLabs[key];
          return `
            <div class="lab-card ${done ? "done-lab" : ""}" data-lab="${key}">
              <div class="lab-card-header">
                <span class="lab-difficulty ${lab.difficulty}">${lab.difficulty}</span>
                <span class="lab-title">${lab.title}</span>
                ${done ? '<span class="lab-done-badge">✅</span>' : ""}
              </div>
              <div class="lab-desc">${lab.desc}</div>
              <button class="lab-btn">
                ${done ? "Mark Incomplete" : "Mark as Done"}
              </button>
            </div>
          `;
        }).join("")}
      </div>
    </div>

    <div class="tab-content" id="tab-resources">
      <div class="resources-grid">
        ${m.resources.map(r => `
          <a class="resource-card" href="${r.url}" target="_blank" rel="noopener">
            <span class="resource-icon">🔗</span>
            <span class="resource-title">${r.title}</span>
            <span class="resource-arrow">↗</span>
          </a>
        `).join("")}
      </div>
    </div>

    <div class="tab-content" id="tab-interview">
      <div class="interview-list">
        ${m.interviewQuestions.map((q, i) => `
          <div class="interview-item" data-qi="${i}">
            <div class="interview-q">
              <span class="interview-num">Q${i + 1}</span>
              <span class="interview-text">${q}</span>
            </div>
            <span class="interview-toggle">click to reveal thinking hints ↓</span>
            <div class="interview-hint">
              Take 2 minutes to think about this. Consider: requirements, scale, trade-offs, failure modes.
            </div>
          </div>
        `).join("")}
      </div>
    </div>

    ${m.codeExamples ? `<div class="tab-content" id="tab-code"></div>` : ""}
  `;

  // Tab switching
  view.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      view.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      view.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
      tab.classList.add("active");
      const tabEl = document.getElementById(`tab-${tab.dataset.tab}`);
      tabEl.classList.add("active");
      // Lazy-render learn tab on first open
      if (tab.dataset.tab === "learn" && m.lessons && !tabEl.dataset.rendered) {
        tabEl.dataset.rendered = "1";
        renderLessons(m, tabEl);
      }
      // Lazy-render code tab on first open
      if (tab.dataset.tab === "code" && m.codeExamples && !tabEl.dataset.rendered) {
        tabEl.dataset.rendered = "1";
        renderCodeExamples(m, tabEl);
      }
    });
  });

  // Topic checkboxes
  view.querySelectorAll(".topic-item").forEach(el => {
    el.addEventListener("click", () => {
      const key = el.dataset.topic;
      state.completedTopics[key] = !state.completedTopics[key];
      if (!state.completedTopics[key]) delete state.completedTopics[key];
      saveState();
      renderModuleView(getModuleById(state.currentModuleId));
    });
  });

  // Lab done buttons
  view.querySelectorAll(".lab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = btn.closest(".lab-card");
      const key = card.dataset.lab;
      state.completedLabs[key] = !state.completedLabs[key];
      if (!state.completedLabs[key]) delete state.completedLabs[key];
      saveState();
      renderModuleView(getModuleById(state.currentModuleId));
    });
  });

  // Complete button
  document.getElementById("completeBtn")?.addEventListener("click", () => {
    state.completedModules[m.id] = !state.completedModules[m.id];
    if (!state.completedModules[m.id]) delete state.completedModules[m.id];
    saveState();
    renderModuleView(getModuleById(state.currentModuleId));
    renderSidebar();
  });

  // Render learn tab on initial load (it's the default active tab)
  if (m.lessons) {
    const learnEl = document.getElementById("tab-learn");
    if (learnEl && !learnEl.dataset.rendered) {
      learnEl.dataset.rendered = "1";
      renderLessons(m, learnEl);
    }
  }

  // System Design button
  if (hasSd) {
    document.getElementById("sdBtn")?.addEventListener("click", () => openSystemDesign(m));
  }

  // Interview expand
  view.querySelectorAll(".interview-item").forEach(el => {
    el.addEventListener("click", () => el.classList.toggle("revealed"));
  });
}

/* =============================================
   RENDER CODE EXAMPLES
   ============================================= */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderCodeExamples(m, container) {
  const sections = m.codeExamples;
  if (!sections || !sections.length) return;

  // Build section nav + content
  container.innerHTML = `
    <div class="code-layout">
      <nav class="code-section-nav" id="codeSectionNav">
        ${sections.map((s, i) => `
          <div class="code-nav-item ${i === 0 ? "active" : ""}" data-sid="${s.id}">
            <span class="code-nav-icon">${s.icon}</span>
            <span class="code-nav-title">${s.title}</span>
          </div>
        `).join("")}
      </nav>
      <div class="code-content" id="codeContent">
        ${sections.map((s, si) => `
          <div class="code-section ${si === 0 ? "active" : ""}" id="csec-${s.id}">
            <div class="code-section-header">
              <span class="code-section-icon">${s.icon}</span>
              <h2 class="code-section-title">${s.title}</h2>
            </div>
            ${s.items.map((item, ii) => {
              const hasPlatforms = item.platforms && (item.platforms.mac || item.platforms.linux);
              const defaultPlatform = hasPlatforms ? "mac" : null;
              return `
              <div class="code-example" id="cex-${s.id}-${ii}">
                <div class="code-example-header">
                  <div class="code-example-meta">
                    <span class="code-example-title">${item.title}</span>
                    ${!hasPlatforms && item.filename ? `<span class="code-filename">${item.filename}</span>` : ""}
                  </div>
                  <div class="code-example-actions">
                    <span class="code-lang-badge">${item.lang}</span>
                    ${!hasPlatforms ? `<button class="code-copy-btn" data-code="${encodeURIComponent(item.code)}" title="Copy code">Copy</button>` : ""}
                  </div>
                </div>
                ${item.desc ? `<p class="code-example-desc">${item.desc}</p>` : ""}
                ${hasPlatforms ? `
                  <div class="platform-tabs" data-example="cex-${s.id}-${ii}">
                    ${item.platforms.mac ? `<button class="platform-tab active" data-platform="mac">macOS</button>` : ""}
                    ${item.platforms.linux ? `<button class="platform-tab${!item.platforms.mac ? " active" : ""}" data-platform="linux">Linux</button>` : ""}
                  </div>
                  ${item.platforms.mac ? `
                    <div class="platform-pane active" data-platform="mac" data-example="cex-${s.id}-${ii}">
                      ${item.platforms.mac.filename ? `<div class="platform-filename"><span class="code-filename">${item.platforms.mac.filename}</span><button class="code-copy-btn" data-code="${encodeURIComponent(item.platforms.mac.code)}" title="Copy code">Copy</button></div>` : `<div class="platform-filename"><button class="code-copy-btn" data-code="${encodeURIComponent(item.platforms.mac.code)}" title="Copy code">Copy</button></div>`}
                      <div class="code-block-wrapper">
                        <pre class="code-pre"><code class="language-${langToPrism(item.lang)}">${escapeHtml(item.platforms.mac.code)}</code></pre>
                      </div>
                    </div>
                  ` : ""}
                  ${item.platforms.linux ? `
                    <div class="platform-pane${!item.platforms.mac ? " active" : ""}" data-platform="linux" data-example="cex-${s.id}-${ii}">
                      ${item.platforms.linux.filename ? `<div class="platform-filename"><span class="code-filename">${item.platforms.linux.filename}</span><button class="code-copy-btn" data-code="${encodeURIComponent(item.platforms.linux.code)}" title="Copy code">Copy</button></div>` : `<div class="platform-filename"><button class="code-copy-btn" data-code="${encodeURIComponent(item.platforms.linux.code)}" title="Copy code">Copy</button></div>`}
                      <div class="code-block-wrapper">
                        <pre class="code-pre"><code class="language-${langToPrism(item.lang)}">${escapeHtml(item.platforms.linux.code)}</code></pre>
                      </div>
                    </div>
                  ` : ""}
                ` : `
                  <div class="code-block-wrapper">
                    <pre class="code-pre"><code class="language-${langToPrism(item.lang)}">${escapeHtml(item.code)}</code></pre>
                  </div>
                `}
                ${item.notes && item.notes.length ? `
                  <div class="code-notes">
                    <div class="code-notes-label">📌 Key Notes</div>
                    <ul class="code-notes-list">
                      ${item.notes.map(n => `<li>${n}</li>`).join("")}
                    </ul>
                  </div>
                ` : ""}
              </div>
            `}).join("")}
          </div>
        `).join("")}
      </div>
    </div>
  `;

  // Section nav clicks
  container.querySelectorAll(".code-nav-item").forEach(navItem => {
    navItem.addEventListener("click", () => {
      container.querySelectorAll(".code-nav-item").forEach(n => n.classList.remove("active"));
      container.querySelectorAll(".code-section").forEach(s => s.classList.remove("active"));
      navItem.classList.add("active");
      document.getElementById(`csec-${navItem.dataset.sid}`).classList.add("active");
    });
  });

  // Platform tab clicks
  container.querySelectorAll(".platform-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const exId = tab.closest(".platform-tabs").dataset.example;
      const platform = tab.dataset.platform;
      // Toggle tabs
      tab.closest(".platform-tabs").querySelectorAll(".platform-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      // Toggle panes
      container.querySelectorAll(`.platform-pane[data-example="${exId}"]`).forEach(p => {
        p.classList.toggle("active", p.dataset.platform === platform);
      });
      // Re-highlight
      if (typeof Prism !== "undefined") {
        const activePane = container.querySelector(`.platform-pane.active[data-example="${exId}"]`);
        if (activePane) Prism.highlightAllUnder(activePane);
      }
    });
  });

  // Copy buttons
  container.querySelectorAll(".code-copy-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const code = decodeURIComponent(btn.dataset.code);
      navigator.clipboard.writeText(code).then(() => {
        const orig = btn.textContent;
        btn.textContent = "Copied!";
        btn.classList.add("copied");
        setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 2000);
      });
    });
  });

  // Syntax highlight
  if (typeof Prism !== "undefined") {
    Prism.highlightAllUnder(container);
  }
}

/* =============================================
   HIGHLIGHTS
   ============================================= */
const HIGHLIGHT_COLORS = [
  { name: "yellow", bg: "#fde047", text: "#1a1a00" },
  { name: "green",  bg: "#86efac", text: "#052e16" },
  { name: "blue",   bg: "#93c5fd", text: "#0c1a3d" },
  { name: "pink",   bg: "#f9a8d4", text: "#3d0020" },
  { name: "orange", bg: "#fdba74", text: "#3d1a00" },
];

let _highlightTooltip = null;

function getHighlightTooltip() {
  if (_highlightTooltip) return _highlightTooltip;
  const el = document.createElement("div");
  el.id = "highlightTooltip";
  el.className = "highlight-tooltip";
  el.innerHTML = `
    <div class="highlight-tooltip-label">Highlight</div>
    <div class="highlight-color-swatches">
      ${HIGHLIGHT_COLORS.map(c => `<button class="highlight-swatch" data-color="${c.name}" style="background:${c.bg}" title="${c.name}"></button>`).join("")}
    </div>
  `;
  document.body.appendChild(el);
  _highlightTooltip = el;
  return el;
}

function hideHighlightTooltip() {
  const el = document.getElementById("highlightTooltip");
  if (el) el.classList.remove("visible");
}

function showHighlightTooltip(x, y, onColor) {
  const el = getHighlightTooltip();
  el.style.left = x + "px";
  el.style.top = y + "px";
  // Remove old listeners by replacing swatches container
  const swatches = el.querySelectorAll(".highlight-swatch");
  swatches.forEach(btn => {
    const cloned = btn.cloneNode(true);
    btn.parentNode.replaceChild(cloned, btn);
  });
  el.querySelectorAll(".highlight-swatch").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onColor(btn.dataset.color);
      hideHighlightTooltip();
    });
  });
  el.classList.add("visible");
}

// Build a list of walkable (highlightable) text nodes under root, with cumulative offsets.
// Excludes text inside <pre>, <code>, and .lesson-code-block to keep offsets consistent
// between serialization and application.
function getHighlightableTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentElement.closest("pre, code, .lesson-code-block")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  let cumulative = 0;
  let node;
  while ((node = walker.nextNode())) {
    nodes.push({ node, start: cumulative, end: cumulative + node.length });
    cumulative += node.length;
  }
  return nodes;
}

// Serialize a Range relative to a container element.
// Offset is computed only over highlightable text nodes so it matches applyHighlights.
function serializeRange(range, container) {
  const selectedText = range.toString();
  if (!selectedText.trim()) return null;

  // Skip selections that start inside a code block
  if (range.startContainer.parentElement &&
      range.startContainer.parentElement.closest("pre, code, .lesson-code-block")) return null;

  const nodes = getHighlightableTextNodes(container);

  // Find the startContainer in our node list and compute the absolute offset
  let startOffset = 0;
  for (const { node, start } of nodes) {
    if (node === range.startContainer) {
      startOffset = start + range.startOffset;
      break;
    }
  }

  return { text: selectedText, startOffset, length: selectedText.length };
}

// Apply all saved highlights for a lesson into its body element
function applyHighlights(lessonBody, lessonKey) {
  const entries = (state.highlights[lessonKey] || []);
  if (!entries.length) return;

  entries.forEach(h => {
    const color = HIGHLIGHT_COLORS.find(c => c.name === h.color) || HIGHLIGHT_COLORS[0];
    highlightTextInNode(lessonBody, h.startOffset, h.length, h.id, color);
  });
}

// Walk highlightable text nodes and wrap the matching range in a <mark>
function highlightTextInNode(root, startOffset, length, hid, color) {
  const nodes = getHighlightableTextNodes(root);
  const rangeEnd = startOffset + length;

  for (const { node, start, end } of nodes) {
    if (start <= startOffset && rangeEnd <= end) {
      const localStart = startOffset - start;
      const localEnd = rangeEnd - start;
      const before = node.textContent.slice(0, localStart);
      const highlighted = node.textContent.slice(localStart, localEnd);
      const after = node.textContent.slice(localEnd);

      if (!highlighted) continue;

      const mark = document.createElement("mark");
      mark.className = "user-highlight";
      mark.dataset.hid = hid;
      mark.dataset.color = color.name;
      mark.style.background = color.bg;
      mark.style.color = color.text;
      mark.textContent = highlighted;

      const parent = node.parentNode;
      const frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      frag.appendChild(mark);
      if (after) frag.appendChild(document.createTextNode(after));
      parent.replaceChild(frag, node);
      return;
    }
  }
}

function addHighlight(moduleId, lessonId, serialized, colorName) {
  const key = `${moduleId}:${lessonId}`;
  if (!state.highlights[key]) state.highlights[key] = [];
  const id = `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  state.highlights[key].push({ id, text: serialized.text, startOffset: serialized.startOffset, length: serialized.length, color: colorName });
  saveState();
  return id;
}

function removeHighlight(moduleId, lessonId, hid) {
  const key = `${moduleId}:${lessonId}`;
  if (!state.highlights[key]) return;
  state.highlights[key] = state.highlights[key].filter(h => h.id !== hid);
  if (!state.highlights[key].length) delete state.highlights[key];
  saveState();
}

// Attach the selection→highlight listener to a lesson body element
function attachHighlightListener(lessonBody, moduleId, lessonId, onHighlightChange) {
  lessonBody.addEventListener("mouseup", (e) => {
    // Don't trigger inside code blocks
    if (e.target.closest("pre, code, .lesson-code-block")) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      hideHighlightTooltip();
      return;
    }

    const range = sel.getRangeAt(0);
    // Ensure selection is within this lesson body
    if (!lessonBody.contains(range.commonAncestorContainer)) {
      hideHighlightTooltip();
      return;
    }

    const serialized = serializeRange(range, lessonBody);
    if (!serialized) return;

    const rect = range.getBoundingClientRect();
    const x = Math.max(4, rect.left + rect.width / 2 - 90); // center tooltip
    const y = Math.max(4, rect.top - 52);                   // above selection (fixed coords)

    showHighlightTooltip(x, y, (colorName) => {
      addHighlight(moduleId, lessonId, serialized, colorName);
      sel.removeAllRanges();
      onHighlightChange();
    });
  });

  // Remove highlight on click
  lessonBody.addEventListener("click", (e) => {
    const mark = e.target.closest(".user-highlight");
    if (!mark) return;
    removeHighlight(moduleId, lessonId, mark.dataset.hid);
    onHighlightChange();
  });
}

/* =============================================
   RENDER LESSONS
   ============================================= */
function renderLessons(m, container) {
  const lessons = m.lessons;
  if (!lessons || !lessons.length) return;

  // Count read lessons
  const readCount = () => lessons.filter(l => state.completedTopics[`${m.id}:lesson:${l.id}`]).length;

  container.innerHTML = `
    <div class="code-layout learn-layout">
      <nav class="code-section-nav" id="lessonNav">
        <div class="learn-progress-row">
          <span class="learn-progress-label">${readCount()}/${lessons.length} read</span>
          <div class="learn-progress-mini"><div class="learn-progress-mini-fill" style="width:${Math.round(readCount()/lessons.length*100)}%"></div></div>
        </div>
        ${lessons.map((l, i) => {
          const isRead = !!state.completedTopics[`${m.id}:lesson:${l.id}`];
          return `
            <div class="code-nav-item ${i === 0 ? "active" : ""}" data-lid="${l.id}">
              <span class="code-nav-icon">${isRead ? "✅" : "○"}</span>
              <div class="code-nav-title">
                <div>${l.title}</div>
                <div class="lesson-read-time">${l.readTime}</div>
              </div>
            </div>
          `;
        }).join("")}
      </nav>
      <div class="code-content lesson-content" id="lessonContent">
        ${lessons.map((l, i) => `
          <div class="code-section lesson-section ${i === 0 ? "active" : ""}" id="lsec-${l.id}">
            <div class="lesson-header">
              <div class="lesson-title-row">
                <h1 class="lesson-title">${l.title}</h1>
                <span class="lesson-time-badge">⏱ ${l.readTime}</span>
              </div>
              <button class="lesson-mark-btn ${state.completedTopics[`${m.id}:lesson:${l.id}`] ? "done" : ""}"
                      data-lid="${l.id}">
                ${state.completedTopics[`${m.id}:lesson:${l.id}`] ? "✓ Mark Unread" : "Mark as Read"}
              </button>
            </div>
            <div class="lesson-body">
              ${l.content.map(block => renderLessonBlock(block)).join("")}
            </div>
            <div class="lesson-footer">
              ${i < lessons.length - 1 ? `<button class="lesson-next-btn" data-next="${lessons[i+1].id}">Next: ${lessons[i+1].title} →</button>` : `<div class="lesson-done-msg">🎉 You've reached the end of the lessons!</div>`}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  // Nav item clicks
  container.querySelectorAll(".code-nav-item").forEach(item => {
    item.addEventListener("click", () => {
      container.querySelectorAll(".code-nav-item").forEach(n => n.classList.remove("active"));
      container.querySelectorAll(".lesson-section").forEach(s => s.classList.remove("active"));
      item.classList.add("active");
      const sec = document.getElementById(`lsec-${item.dataset.lid}`);
      sec.classList.add("active");
      sec.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // Mark as read buttons
  container.querySelectorAll(".lesson-mark-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const lid = btn.dataset.lid;
      const key = `${m.id}:lesson:${lid}`;
      state.completedTopics[key] = !state.completedTopics[key];
      if (!state.completedTopics[key]) delete state.completedTopics[key];
      saveState();
      renderLessons(m, container);
      if (typeof Prism !== "undefined") Prism.highlightAllUnder(container);
    });
  });

  // Next lesson buttons
  container.querySelectorAll(".lesson-next-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const nextId = btn.dataset.next;
      const navItem = container.querySelector(`[data-lid="${nextId}"]`);
      navItem?.click();
    });
  });

  if (typeof Prism !== "undefined") Prism.highlightAllUnder(container);

  // Restore and wire up highlights for each lesson
  lessons.forEach(l => {
    const body = container.querySelector(`#lsec-${l.id} .lesson-body`);
    if (!body) return;
    applyHighlights(body, `${m.id}:${l.id}`);
    attachHighlightListener(body, m.id, l.id, () => {
      renderLessons(m, container);
      if (typeof Prism !== "undefined") Prism.highlightAllUnder(container);
    });
  });
}

function renderLessonBlock(block) {
  switch (block.type) {
    case "text":
      return `<p class="lesson-p">${block.text}</p>`;

    case "heading":
      const tag = block.level === 3 ? "h3" : "h2";
      const cls = block.level === 3 ? "lesson-h3" : "lesson-h2";
      return `<${tag} class="${cls}">${block.text}</${tag}>`;

    case "code":
      return `
        <div class="lesson-code-block">
          <div class="lesson-code-header">
            ${block.filename ? `<span class="code-filename">${block.filename}</span>` : ""}
            <span class="code-lang-badge">${block.lang}</span>
            <button class="code-copy-btn" data-code="${encodeURIComponent(block.code)}">Copy</button>
          </div>
          <div class="code-block-wrapper">
            <pre class="code-pre"><code class="language-${langToPrism(block.lang)}">${escapeHtml(block.code)}</code></pre>
          </div>
        </div>
      `;

    case "callout":
      const icons = { info: "💡", warning: "⚠️", tip: "✅", gotcha: "🔥" };
      return `
        <div class="lesson-callout callout-${block.variant}">
          <div class="callout-header">${icons[block.variant] || "📌"} ${block.title}</div>
          <div class="callout-body">${block.text}</div>
        </div>
      `;

    case "diagram":
      return `
        <div class="lesson-diagram">
          <pre class="diagram-pre">${escapeHtml(block.code || block.content)}</pre>
        </div>
      `;

    case "list":
      return `
        <ul class="lesson-list">
          ${block.items.map(item => `<li>${item}</li>`).join("")}
        </ul>
      `;

    case "comparison":
      return `
        <div class="lesson-table-wrap">
          <table class="lesson-table">
            <thead>
              <tr>${block.headers.map(h => `<th>${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${block.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </div>
      `;

    default:
      return "";
  }
}

// Wire up copy buttons in lessons (delegated to document since lessons render lazily)
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".code-copy-btn");
  if (!btn || !btn.dataset.code) return;
  navigator.clipboard.writeText(decodeURIComponent(btn.dataset.code)).then(() => {
    const orig = btn.textContent;
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 2000);
  });
});

// Hide highlight tooltip when clicking outside it
document.addEventListener("mousedown", (e) => {
  if (!e.target.closest("#highlightTooltip")) {
    hideHighlightTooltip();
  }
});

function langToPrism(lang) {
  const map = { bash: "bash", shell: "bash", dockerfile: "docker", docker: "docker",
    yaml: "yaml", json: "json", python: "python", go: "go", js: "javascript",
    javascript: "javascript", typescript: "typescript", toml: "toml" };
  return map[lang] || lang;
}

/* =============================================
   SYSTEM DESIGN MODAL
   ============================================= */
let sdTimer = null;
let sdSeconds = 0;

function openSystemDesign(m) {
  const sd = m.systemDesign;
  document.getElementById("sdTitle").textContent = `System Design — ${m.title}`;
  document.getElementById("sdPrompt").textContent = sd.prompt;
  document.getElementById("sdHints").innerHTML = sd.hints
    .map(h => `<li>${h}</li>`)
    .join("");
  document.getElementById("sdOverlay").classList.add("open");
  resetTimer();
}

function closeSystemDesign() {
  document.getElementById("sdOverlay").classList.remove("open");
  resetTimer();
}

function resetTimer() {
  clearInterval(sdTimer);
  sdTimer = null;
  sdSeconds = 0;
  document.getElementById("sdTimerDisplay").textContent = "";
  document.getElementById("sdTimerBtn").textContent = "▶ Start 30-min Timer";
}

function startTimer() {
  if (sdTimer) {
    clearInterval(sdTimer);
    sdTimer = null;
    document.getElementById("sdTimerBtn").textContent = "▶ Start 30-min Timer";
    document.getElementById("sdTimerDisplay").textContent = "";
    sdSeconds = 0;
    return;
  }
  sdSeconds = 30 * 60;
  document.getElementById("sdTimerBtn").textContent = "⏹ Stop";
  sdTimer = setInterval(() => {
    sdSeconds--;
    const m = String(Math.floor(sdSeconds / 60)).padStart(2, "0");
    const s = String(sdSeconds % 60).padStart(2, "0");
    document.getElementById("sdTimerDisplay").textContent = `${m}:${s}`;
    if (sdSeconds <= 0) {
      clearInterval(sdTimer);
      document.getElementById("sdTimerDisplay").textContent = "Time's up!";
      document.getElementById("sdTimerBtn").textContent = "▶ Start 30-min Timer";
    }
  }, 1000);
}

/* =============================================
   MOBILE SIDEBAR
   ============================================= */
function closeMobileSidebar() {
  document.getElementById("sidebar").classList.remove("mobile-open");
}

/* =============================================
   INIT
   ============================================= */
function applyTheme() {
  const isLight = state.theme === "light";
  document.documentElement.setAttribute("data-theme", isLight ? "light" : "");
  const dark = document.getElementById("prismThemeDark");
  const light = document.getElementById("prismThemeLight");
  if (dark) dark.disabled = isLight;
  if (light) light.disabled = !isLight;
}

function init() {
  loadState();
  applyTheme();

  renderSidebar();
  renderDashboard();

  // Sidebar toggle (desktop collapse)
  document.getElementById("sidebarToggle").addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle("mobile-open");
    } else {
      sidebar.classList.toggle("collapsed");
    }
  });

  // Mobile menu button
  document.getElementById("menuBtn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("mobile-open");
  });

  // Theme toggle
  document.getElementById("themeBtn").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    saveState();
  });

  // Reset progress
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (!confirm("Reset all progress? This cannot be undone.")) return;
    state.completedModules = {};
    state.completedTopics = {};
    state.completedLabs = {};
    state.highlights = {};
    saveState();
    renderSidebar();
    if (state.currentView === "dashboard") renderDashboard();
    else renderModuleView(getModuleById(state.currentModuleId));
  });

  // System design modal
  document.getElementById("sdClose").addEventListener("click", closeSystemDesign);
  document.getElementById("sdOverlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeSystemDesign();
  });
  document.getElementById("sdTimerBtn").addEventListener("click", startTimer);

  // Hints reveal on click
  document.getElementById("sdHints").addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (li) li.classList.toggle("revealed");
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSystemDesign();
  });
}

document.addEventListener("DOMContentLoaded", init);
