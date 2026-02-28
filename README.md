# AI Backend Engineer — Learning Path

A self-paced, 20-week interactive learning platform built for engineers who want to break into AI/ML backend engineering. Covers everything from Docker fundamentals to deploying LLMs in production, with structured lessons, code examples, hands-on labs, and interview prep at every step.

**No backend server required.** Open one HTML file in your browser and start learning.

---

## What's Inside

| Phase | Weeks | Topics |
|-------|-------|--------|
| **Phase 1** — Containerization & Backend Foundations | 1–4 | Docker, FastAPI, PostgreSQL, MongoDB, Redis |
| **Phase 2** — Kubernetes & Cloud Infrastructure | 5–8 | Kubernetes (fundamentals + advanced), CI/CD, GCP/AWS |
| **Phase 3** — Distributed Systems & Kafka | 9–12 | Microservices, gRPC, Kafka, event-driven architecture |
| **Phase 4** — AI/ML Engineering in Production | 13–17 | LLM serving (vLLM), RAG, LangChain, LangGraph, Observability |
| **Phase 5** — System Design & Interview Prep | 18–20 | Large-scale system design, capstone project, mock interviews |

### 15 Modules Total

| # | Module | Status |
|---|--------|--------|
| M1 | Docker Deep Dive | ✅ Full lessons + code examples |
| M2 | Python + FastAPI for Production | ✅ Full lessons + code examples |
| M3 | Databases: PostgreSQL, MongoDB, Redis | ✅ Full lessons + code examples |
| M4 | Kubernetes Fundamentals | ✅ Full lessons + code examples |
| M5 | Kubernetes Advanced: Networking, Storage, Security | ✅ Full lessons + code examples |
| M6 | CI/CD Pipelines | Topics, labs, and resources |
| M7 | Cloud Platforms: GCP / AWS / Azure | Topics, labs, and resources |
| M8 | Microservices Architecture | Topics, labs, and resources |
| M9 | Kafka & Message Queues | Topics, labs, and resources |
| M10 | LLMs & AI Serving Frameworks | Topics, labs, and resources |
| M11 | RAG, LangChain & Vector Databases | Topics, labs, and resources |
| M12 | Agentic AI: LangGraph, AutoGen, ADK | Topics, labs, and resources |
| M13 | AI Observability & Monitoring | Topics, labs, and resources |
| M14 | Large-Scale System Design | Topics, labs, and resources |
| M15 | Interview Preparation | Topics, labs, and resources |

> Modules M1–M5 include full written lessons and runnable code examples. The remaining modules contain curated topics, hands-on lab descriptions, external resources, and interview questions — lesson content is being added progressively.

---

## How to Run

### Option 1 — Just open the file (simplest)

```bash
git clone https://github.com/archmaester/learn-kubernetes.git
cd learn-kubernetes
open index.html          # macOS
# xdg-open index.html   # Linux
# start index.html       # Windows
```

That's it. No installs, no build step, no server.

### Option 2 — Serve locally (recommended)

Serving over HTTP avoids any browser restrictions on local `file://` URLs.

**Using Python (built-in):**
```bash
cd learn-kubernetes
python3 -m http.server 8080
# Open http://localhost:8080
```

**Using Node.js:**
```bash
npx serve .
# Open the URL printed in the terminal
```

**Using VS Code:**
Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension, right-click `index.html`, and select **Open with Live Server**.

---

## Dependencies

**None to install.** Everything runs in the browser.

The only external resources loaded at runtime (requires internet connection):

| Library | Purpose | Loaded From |
|---------|---------|-------------|
| [Prism.js](https://prismjs.com/) v1.29.0 | Syntax highlighting for code blocks | cdnjs.cloudflare.com |

If you want to run fully offline, download the Prism CSS and JS files and update the `<link>` and `<script>` tags in `index.html` to point to local copies.

---

## Features

- **Progress tracking** — check off topics, labs, and full modules; progress persists in `localStorage` across sessions
- **Lessons** — structured written content with diagrams, comparison tables, callouts, and code blocks
- **Code examples** — production-ready snippets organized by concept, with syntax highlighting and usage notes
- **Labs** — hands-on exercises graded by difficulty (beginner / intermediate / advanced)
- **Interview questions** — curated per module, reflecting real interview patterns for AI backend roles
- **System design challenges** — open-ended prompts with a built-in 30-minute timer and reveal-on-click hints
- **External resources** — hand-picked docs, books, and free courses for each topic
- **Dark / light theme** — toggle with the ◐ button in the top-right
- **Reset progress** — the ↺ button clears all saved state

---

## Repository Structure

```
learn-kubernetes/
│
├── index.html                        # Entry point — open this in your browser
├── styles.css                        # All styling (no framework)
│
├── curriculum.js                     # Full 20-week curriculum definition:
│                                     # phases, modules, topics, labs,
│                                     # resources, interview questions, system design prompts
│
├── app.js                            # Application logic:
│                                     # routing, rendering, state management,
│                                     # progress tracking (localStorage)
│
│── docker-lessons.js                 # M1: written lesson content
├── docker-examples.js                # M1: code examples
│
├── fastapi-lessons.js                # M2: written lesson content
├── fastapi-examples.js               # M2: code examples
│
├── db-lessons.js                     # M3: written lesson content
├── db-examples.js                    # M3: code examples
│
├── kubernetes-lessons.js             # M4: written lesson content
├── kubernetes-examples.js            # M4: code examples
│
├── kubernetes-advanced-lessons.js    # M5: written lesson content
└── kubernetes-advanced-examples.js   # M5: code examples
```

### How the code is organized

`curriculum.js` defines the `CURRICULUM` global object — a single source of truth for every module's metadata (topics, labs, resources, interview questions). It does not contain lesson prose or code examples.

Each `*-lessons.js` file patches the corresponding module object at runtime using an IIFE:

```js
(function patchDockerLessons() {
  const m = CURRICULUM.phases[0].modules[0];
  m.lessons = [ /* ... */ ];
})();
```

Each `*-examples.js` file does the same for `m.codeExamples`. This keeps the curriculum definition separate from the content, and makes it easy to add new modules without touching existing files.

Load order in `index.html`:
```
curriculum.js → [module]-lessons.js → [module]-examples.js → app.js
```

`app.js` always loads last, after all content has been patched into `CURRICULUM`.

---

## Contributing

Contributions are welcome, especially lesson content for M6–M15.

To add lessons for a new module:

1. Create `<module>-lessons.js` following the pattern in any existing lessons file
2. Create `<module>-examples.js` following the pattern in any existing examples file
3. Add both `<script>` tags to `index.html` before `<script src="app.js">`
4. Update the module status table in this README

Supported content block types in lessons:

| Type | Description |
|------|-------------|
| `text` | Paragraph with inline HTML allowed |
| `heading` | Section heading with `level` (2 or 3) |
| `code` | Fenced code block with `lang`, `filename`, `code` |
| `callout` | Highlighted box with `variant` (`info`, `tip`, `warning`) and `title` |
| `diagram` | Monospaced ASCII diagram |
| `comparison` | Table with `headers` and `rows` arrays |

---

## Who This Is For

- Software engineers transitioning into AI/ML backend roles
- Backend developers who want to go deeper on cloud-native infrastructure
- Engineers preparing for system design interviews at AI-first companies
- Self-learners who prefer structured, opinionated paths over scattered tutorials

---

## License

MIT
