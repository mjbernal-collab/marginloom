# Marginloom user guide

For the hackathon overview and current model, tool, hosting, and asset disclosures, see [README.md](README.md).

A local AI revision coach: import your materials, ask questions with source passages, generate practice quizzes, explore interactive lessons, explain ideas by voice, play learning games, and revisit mistakes. Notes and progress stay in the browser's IndexedDB. There is no cloud inference API. The local app needs no account; the current owner-private hosted demo requires sign-in for access.

## Run on this Windows laptop

For the normal desktop app, open **`release/Marginloom-Setup-0.9.6.exe`**. It installs Marginloom with desktop and Start-menu shortcuts and bundles the runtime, so end users do not need the source files or command window. See [INSTALL.md](INSTALL.md) for desktop and phone installation details, and [RELEASE_NOTES.md](RELEASE_NOTES.md) for natural voices, the interactive voice orb and the final layout pass. The developer launcher below remains available for browser testing.

Double-click **Start-Marginloom.cmd** in this folder. It uses the bundled Codex Node runtime when available, installs missing dependencies, builds the app, and opens **http://localhost:4173**. Keep the terminal window open. Press Ctrl+C to stop it. The original `Start-Study-Buddy.cmd` launcher also works.

If you downloaded a ZIP, click **Extract all** first, then open the extracted folder and run the launcher. All project files must be extracted together.

If Marginloom is already running on port 4173, the launcher rebuilds the interface and opens the existing server. Keep the original terminal open. If an “An app update is ready” notice appears, choose Update while online before testing offline again.

On a different computer, install Node.js LTS first. The launcher can use npm or pnpm. For development:

```powershell
pnpm install
pnpm dev
```

With npm, use `npm install` and `npm run dev`. For offline caching, use the production build:

```powershell
pnpm build
pnpm preview --port 4173
```

Development runs at http://localhost:5173. Production preview runs at http://localhost:4173. These are different browser origins: they have separate notes and model caches. Use production preview for the hackathon demo.

## First study session

1. Open the app in a recent Chrome or Edge browser.
2. Choose **Try a sample chapter**, import a text PDF, or paste notes.
3. You can search original source passages immediately.
4. Open **Settings & offline setup**, select **Balanced** for the laptop or **Compact** for a supported phone, and click **Download AI for offline use**.
5. Keep the tab open while it downloads the embedding model and selected language model. Downloads may be hundreds of MB or several GB. The app shows estimated sizes and progress.
6. Ask a question, open its source, generate a quiz, and practice a missed answer.

After a page restart, saved AI loads automatically into memory while you stay on your study desk. The status says Opening your saved AI; this is not a download. Cached restoration blocks remote model downloads. Missing files show a repair message and require a connection to repair setup. Changing the selected model offers Load saved AI if that model is cached, or Download AI for offline use for a new model. Compact offers lower memory use at the cost of answer quality.

## Learning games

Word Trail accepts direct keyboard entry into its blank tiles. Enter checks the word; Backspace edits it. Typing and tile clicks update the same attempt. Word groups and hyphens stay visible in the slots; spaces and hyphens are optional during answer checking.

Open **Games**, choose your material, and click **Build games from notes**. Word Trail asks you to build an answer with letter tiles; tap a filled letter to remove it. Hints progressively reveal starting letters. A solved word earns 100 base points plus up to 300 speed points, reduced by 5 per active second and 75 per hint. Time pauses outside the game or in a hidden tab; revealing the answer earns no points. Memory Match pairs words with clues using animated card flips, with reduced-motion support. Flashcards let you reveal answers, mark them remembered, or return them to the end of the review queue.

Source mode selects concepts from factual sentences and skips reviewer headings. It needs no AI setup. Enable **Let local AI write the clues** for short recall questions generated on the device. Each clue keeps its original evidence and a source link. Small models can still write imperfect questions; check the passage. Saved sets from the older word-selection algorithm need to be rebuilt once.

Game sets are saved locally for offline replay. Sound is synthesized on the device after interaction; the sound toggle remembers your preference. Switching tabs preserves the current round, while reopening starts a new round from the saved set. Game stars and turns do not affect Practice accuracy, sessions, or mistake review.

## Learn together

Open **Learn together** beside the chat composer, or type **Explore this lesson**, **I have 15 minutes**, or **Teach it back** in chat. These tools open in one focused window; no additional navigation tabs are required.

- **Interactive lessons:** local AI composes a sequence of available source reading, concept connections, evidence annotation, numbered sequence reconstruction, and arithmetic graph elements. Element IDs and source references are checked before rendering; no generated JavaScript is executed. Source mode supplies a usable composition when AI is unavailable or its arrangement fails validation. Graphs require an explicit `y =` formula using numbers, `x`, parentheses and arithmetic; trigonometry, symbolic multi-variable equations, diagram extraction and arbitrary physical/clinical simulations are not supported. Sequences require an explicitly numbered source order. Interpretation activities do not force one right answer.
- **Short study sessions:** choose 5–45 minutes. The planner uses only the chosen material's upcoming quiz and unresolved mistakes, then guides understanding, recall, explanation and recap. Time allocations are suggestions. Timer and phase progress are saved; the timer pauses while the window is closed, the app is hidden, or AI/voice is processing. Reopening resumes paused. Session progress and takeaways are included in backups, and material deletion removes them. Generated conversation text and temporary activity attempts are not saved.
- **Teach it back:** explain a concept and receive local tutor feedback, then ask follow-up questions. A source-term checklist reports mentions only, not mastery. Feedback is not semantically verified; invalid/missing citations are flagged and numbered original passages remain accessible.
- **Offline voice:** optional English transcription uses `Xenova/whisper-tiny.en` (Whisper Tiny, quantized ONNX) via Transformers.js on CPU in a worker. Press **Set up offline voice** once while connected. Later recordings use cache-only loading; missing files offer setup again instead of silently downloading. Record at most 60 seconds, stop, check the transcript, then send it. Raw recordings are not saved or uploaded. Optional spoken responses use locally generated Kokoro neural speech after explicit setup, or installed English voices with `localService=true`; remote browser recognition and remote TTS are not used. Microphone access requires HTTPS, localhost, or the packaged Windows app. Phone microphone/inference behavior is unverified.

Learning UI is loaded on demand. Speech workers are terminated after each turn; transcription and tutor generation run sequentially. Cached PWA assets include the learning and speech workers, while speech model files are a separate optional download. Ordinary activities need no continuous model generation. Device-specific latency and memory limits still apply, especially with Detailed and on phones.

## Offline demonstration

Use the production preview, not Vite's development server. Load the model, index materials, and wait for **App files cached** in Settings. Then disconnect the internet, close the tab, reopen http://localhost:4173 (with the local preview server still running), wait for Local AI ready, import a new small TXT or PDF, ask a new question, and generate a new quiz.

The app's connection badge reflects the browser's connection hint; it is not proof of cloud independence. A fresh disconnected session is the actual test. Persistent storage is requested only when you press its button and may be denied by the browser. Clearing site data or private browsing can erase documents, progress, or models.

The app shell, workers, PDF parser, and ONNX WASM runtime are bundled/cached locally. WebLLM and Transformers.js manage model artifact caches separately. Initial model downloads contact Hugging Face and MLC artifact hosts; imported document text is processed on the device. No analytics or remote fonts are included.

## Mobile testing

The layout supports phones, but full phone generation requires a WebGPU-compatible browser, sufficient memory, and a **secure context**. Opening your laptop's local-network IP over plain HTTP will display the app but does not enable browser GPU inference or PWA installation.

Build the app and serve `dist/` on HTTPS, or use a development HTTPS setup with a certificate trusted by the phone. Then load **Compact** on the phone itself. This project does not automatically publish your files or create a tunnel. Each device maintains its own notes, progress, and downloaded models.

Mobile source search and saved practice questions can work without a language model. Phone requests are never silently forwarded to the laptop or a cloud model. Do not claim every phone is supported: benchmark the actual target device.

## Features and limits

- Text-based PDF, TXT, Markdown, or pasted notes; 20 MB and 100 PDF pages maximum.
- Original text passages with document name and page number. Scanned documents need external OCR and are not supported in this version.
- Immediate keyword source search; local semantic retrieval after model setup.
- Embedding chunks are checked against the tokenizer and split to fit its input limit.
- Streamed local explanations with citation identifiers and source inspection.
- Three- or five-question quizzes, constrained JSON, distinct options, valid answer index, and evidence selected directly from original source sentences. Direct positive questions are required; exactly one answer option must appear in the supporting sentence.
- Evidence validation checks source presence, not logical correctness. AI-generated answers and quizzes can still be wrong.
- Persistent session results and missed-question practice. A missed question clears after a later correct attempt. Flashcards separately use Again / Hard / Remembered / Easy ratings and persisted due dates.
- English retrieval model. Multilingual and Taglish performance is not validated.
- Export and restore full JSON backups of materials, progress, corrections, flashcard schedules, goals and quiz reminders. AI model caches are separate.
- Cache-aware PWA setup. Full mobile generation, GPU memory use, and offline model reload must be tested on target hardware.

## Validation

```powershell
pnpm test
pnpm build
```

Core tests cover scoped retrieval, absent answers, vector compatibility, chunk overlap, citation mapping, quiz evidence validation, and mistake prioritization. Browser checks should also cover import, persistence, responsive layout, model setup, quiz completion, mistake review, document removal, and disconnected restart.

## Hackathon disclosure

- Language models: Qwen2.5-0.5B/1.5B/3B-Instruct in WebLLM's MLC q4f16_1 format; only the selected model is downloaded.
- Embedding model: Xenova/all-MiniLM-L6-v2 (quantized ONNX).
- Frameworks and tools: React, Vite, WebLLM, Transformers.js, ONNX Runtime Web, PDF.js, idb/IndexedDB, Lucide React, vite-plugin-pwa/Workbox, pnpm, Node.js.
- Windows desktop packaging: Electron and electron-builder/NSIS; application and installer icon derived from the Marginloom notebook SVG.
- Development assistance: OpenAI Codex. Disclose any additional tools you use later.
- Cloud services: dependency/model artifact downloads and static HTTPS hosting through OpenAI Sites. The owner-private hosted demo requires sign-in for access. Core AI inference remains on the device.
- Sample asset: a short original explanatory chapter on photosynthesis included in this app.
- Build timing: document which work was done during the hackathon and disclose any work from before its start. Do not imply earlier code was created during the event.

Resolved dependency versions are recorded in `pnpm-lock.yaml`. Model license notices are available in `MODEL_NOTICES.md`; redistribution requires respecting the upstream licenses.

## Study planning and reviewers (0.7.1)

On the Study desk, use the quiz calendar to choose a material, confirm its suggested subject, and set a quiz date. Reminders derive their subject from that material; they cannot select another course independently. Subject suggestions come from file names and need your confirmation. Upcoming dates show Today, Tomorrow, or days remaining. These are in-app reminders, not notifications while Marginloom is closed.

Set a session goal for flashcards or completed quiz questions. Exam focus restricts newly generated Practice questions to selected materials/topics, optional pages and optionally unresolved-mistake passages. In Games → Customize set, choose key concepts, edit a bad answer/clue or discard it, and rate flashcards Again, Hard, Remembered or Easy. Due dates and corrections persist on this device.

Create a reviewer beside the chat composer opens an editable reviewer with original passages and page citations. Save drafts, download a standalone HTML reviewer, or choose Print / save as PDF and select Save as PDF in the print window. Optional local AI overviews and mistake explanations can be inaccurate; check them against the source. The source-based reviewer does not require a language model.

Settings supports full JSON backup export and validated restore. Matching record IDs are replaced; other records are kept. Backups include materials, sessions, mistakes, game sets, corrections, schedules, calendar dates, goals and reviewer drafts. Downloaded AI model caches are not transferred.

## Topic focus — 0.7.1

Exam focus now offers topic suggestions from factual source terms and short headings. Select topics to restrict question evidence to matching sentences, including when different topics share a page. Open Check passages to inspect the evidence, rename the display label, or add another phrase that appears in the material. A renamed label retains its original source matching phrase. Page filters remain optional; no topics checked means the whole selected material. Missed-question focus describes passage filtering rather than claiming broader weakness detection.

Suggestions and topic matching are local text processing. Topic matches use exact phrases with word boundaries, so synonyms or implicit references can be missed. This is not a complete semantic outline of every document. The question generator prefers factual concept subjects as answers and preserves original passage/page citations. Detailed AI may improve wording but does not guarantee question correctness. Optional corrections remain available for every model.

## Workspace layout — 0.7.1

Ask “create a reviewer” in chat to open an editable sourced draft for the selected material. If all materials are selected, choose a material in the reviewer window. The small Create a reviewer action is beside the chat composer. Reviewer drafts, original passages, HTML download and Print / save as PDF remain available. A source-passage draft is used when no factual concept cards can be extracted.

Exam focus is now in Practice and opens only when needed. The home page keeps the calendar and a compact optional session goal. Games puts material selection and game choices first; Customize set contains the AI clue toggle, concept selection and card correction. Review due cards has been removed. Flashcard rating records still persist and are included in backups. During a game, the large mode cards shrink to compact game switches.

File selection and drag/drop both show a naming screen before anything is saved. Edit each material name and its suggested subject, then choose Add material, or cancel. Original filenames are preserved as metadata. If a batch partly succeeds, only the remaining files stay in the dialog for retry. Pasted notes keep their existing named-note workflow.

Word Trail accepts keyboard letters directly in its tiles. Backspace removes the last letter and Enter checks the answer; spaces and hyphens are optional. Touch letter buttons remain. Tapping an empty answer tile focuses an accessible, visually hidden keyboard input for touch devices. The visible keyboard text box has been removed. Game key handling is paused in dialogs, other text fields and other tabs.




## Longer quizzes and study shortcuts

Use the Study desk shortcuts to open a guided session, interactive lesson, teach-back or reviewer. In Practice, choose a preset or enter 1–50 questions. “Cover the selected material” rotates through documents and pages; “Prioritize my mistakes” starts with missed-question passages. Exam focus is inside quiz setup. Generation is sequential to limit device memory, with progress and an option to stop after the current question and use completed questions. Small documents or quality-check failures can yield fewer questions. This does not guarantee exhaustive conceptual coverage.

## Subject-based study

Chat, Practice and Games choose a subject and use all material assigned to it. Original files and page citations stay separate. Subject labels are grouped ignoring capitalization and repeated spaces, with no inferred equivalence between different course names. Unconfirmed material remains unassigned; use the pencil beside a material to edit and confirm its subject. Import and pasted-note forms accept a subject. Optional exam focus can still narrow to particular files, topics or pages within the selection. Interactive lessons, guided sessions and reviewer drafts retain their individual-material selection within the chosen subject.
