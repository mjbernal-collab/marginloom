# Marginloom

**Your notes. Your pace. Even when the cloud disappears.**

## Project name

Marginloom — a local AI study notebook for students.

## Problem

Students often have lecture PDFs, reviewers, and notes but struggle to turn them into a useful study session. A cloud-only tutor stops being available when internet access is unreliable, and requires sending study material to a remote inference service. Students also need different ways to learn: serious practice, games, explanations, and speaking an idea aloud.

## Brief description

Marginloom turns a student's own materials into a study workspace. Import a text PDF, TXT, Markdown file, or pasted notes; ask questions with original source passages; generate practice quizzes; revisit mistakes; build learning games and flashcards; explore interactive lessons; or explain a concept to a local tutor with optional voice support.

The app runs as a packaged Windows application or an installable web app. Materials, progress, and downloaded models stay in device-local storage. After the initial app and model setup, supported devices can generate new AI answers and practice content without a cloud AI API.

## Why does this product benefit from running AI locally?

**A student's tutor should not disappear when their internet does.** Marginloom runs language-model inference and semantic retrieval on the student's device, so students can keep asking new questions and generating practice from their notes while disconnected, after setup.

- **Access without a connection:** a cloud-only tutor cannot answer a new question when there is no network. Marginloom can, using cached models and locally stored material.
- **Private study material:** imported text and voice recordings are processed on the device rather than submitted to a cloud inference API.
- **Repeated practice without per-request cloud AI charges:** practice does not require a paid inference account. Local storage, download size, and compute costs still apply.
- **Different learning styles in one workspace:** the same local source material supports explanations, quizzes, games, short study sessions, and teach-back conversations.

This is actual on-device AI, not merely an app for a local audience or a collection of prewritten answers. The promo includes a fresh answer generated with browser networking disabled. Local AI is not claimed to be faster or more accurate than cloud models.

## What students can do

| Feature | What it does |
| --- | --- |
| Ask your notes | Retrieve passages and generate explanations with source links and page references. |
| Practice | Generate 1–50 questions spanning selected documents and pages, inspect supporting evidence, and revisit missed questions. |
| Exam focus | Restrict new practice to chosen materials, suggested topics, optional pages, or missed-question passages. |
| Learning games | Play Word Trail, Memory Match, and flashcards from sourced concept cards, with optional locally synthesized sounds. |
| Interactive lessons | Compose source reading, concept connections, evidence annotation, explicit numbered sequences, and supported arithmetic graphs. |
| Short study sessions | Guide a 5–45 minute session through understanding, recall, explanation, and recap; “I have 15 minutes” opens this flow. |
| Teach it back | Explain a concept, get local tutor feedback, and continue the conversation; optional English transcription and speech are local. |
| Reviewers | Open an editable sourced draft from chat or the Study desk shortcut; download HTML or use Print / Save as PDF. |
| Quiz calendar | Link an upcoming quiz to an uploaded material and its confirmed subject. Reminders are visible in the app. |
| Appearance | Choose Light, Dark, or System in Settings, or use the top-bar sun/moon toggle; preference is saved on this device. |
| Backup and restore | Export and restore study records as JSON. Downloaded AI model caches are separate. |

## Local AI architecture

```text
Imported material → PDF/text parsing → page-aware source chunks
                                      ↓
                             local MiniLM embeddings
                                      ↓
Question → local retrieval → relevant passages → local Qwen model
                                                   ↓
                                   answer / quiz / lesson + sources

Recorded voice → local Whisper → editable transcript → local tutor
Tutor response → local Kokoro or installed local voice → spoken audio

Materials, progress, and drafts → IndexedDB on this device
Models → runtime-managed caches on this device
```

Qwen runs through WebLLM using WebGPU in a worker. MiniLM embeddings, Whisper transcription, and Kokoro speech use local ONNX inference; Whisper and Kokoro use CPU/WASM workers. Optional speech downloads are separate from tutor setup. Topic suggestions, source-card extraction, timers, calendar logic, and activity rendering also run locally, but are deterministic application logic rather than additional AI models.

The interactive lesson engine composes supported elements and validates source references. It does not execute AI-generated JavaScript or provide arbitrary simulations of every subject.

## Models

| Purpose | Exact model / format | Use |
| --- | --- | --- |
| Compact tutor | `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` | Smaller download and lower memory requirement; simpler answers. |
| Balanced tutor | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | Default starting profile. |
| Detailed tutor | `Qwen2.5-3B-Instruct-q4f16_1-MLC` | Optional larger profile; greater memory requirement. |
| Semantic retrieval | `Xenova/all-MiniLM-L6-v2`, quantized ONNX (`q8`) | Local document and query embeddings. |
| English transcription | `Xenova/whisper-tiny.en`, quantized ONNX (`q8`) | Optional local speech recognition. |
| Natural speech | `onnx-community/Kokoro-82M-v1.0-ONNX`, quantized ONNX (`q8`) | Optional local spoken responses and promo narration. |

Only the selected tutor profile is downloaded. Kokoro voice styles bundled with the app are Heart (`af_heart`), Bella (`af_bella`), Puck (`am_puck`), and Emma (`bf_emma`). Installed operating-system English voices with `localService=true` are an alternative to Kokoro.

Model sources and license information are recorded in [MODEL_NOTICES.md](MODEL_NOTICES.md). The project uses pretrained models; it does not train its own foundation model. Model weights are downloaded during explicit setup rather than included in the source repository.

## Tools, frameworks, and APIs

| Category | Tools and role |
| --- | --- |
| App interface | React, React DOM, Lucide React icons, CSS, Vite and its React plugin. |
| Local language inference | WebLLM / MLC and browser WebGPU. |
| Embeddings and transcription | Hugging Face Transformers.js and ONNX Runtime Web. |
| Local speech | `kokoro-js`; its phonemizer dependency uses eSpeak NG. Browser speech synthesis supports installed local voices. |
| Document import | PDF.js for text-based PDFs; local TXT and Markdown parsing. |
| Persistence | `idb`, IndexedDB, and runtime-managed model caches. |
| Offline web app | `vite-plugin-pwa`, Workbox, service workers, and Cache Storage. |
| Audio and recording | Browser Web Audio and MediaRecorder APIs; locally synthesized game effects. |
| Windows packaging | Electron 44.7.0, electron-builder 26.15.3, NSIS installer. |
| Development and checks | Node.js, pnpm, PowerShell, Node test runner, Playwright with Microsoft Edge. |
| AI development assistance | OpenAI Codex / ChatGPT, used for implementation, debugging, documentation, and demo production assistance. No cloud assistant is called by the app's core study workflows. |
| Static hosting | OpenAI Sites at the HTTPS demo address below; hosting serves app files, not a cloud tutor. |
| Promo production | Python, Pillow, NumPy, FFmpeg via imageio-ffmpeg, Playwright UI captures, and local Kokoro narration. |

Direct dependencies and version ranges are in [package.json](package.json) and [desktop/package.json](desktop/package.json). The root and desktop `pnpm-lock.yaml` files record resolved dependencies, including transitive packages. Third-party licenses remain in dependency packages; see [MODEL_NOTICES.md](MODEL_NOTICES.md).

## Assets and attribution

- **Brand and application graphics:** the Marginloom notebook SVG, installation icons derived from it, leaf motif, and interface illustrations are project-created assets. Lucide React supplies third-party interface icons.
- **Sample chapter:** an original short explanatory photosynthesis chapter is included for trying the app.
- **Study documents:** PDFs and notes are supplied by the student. The demo uses the participant-supplied `Java_Reviewer_Expanded.pdf` and a small algebra fixture created for demonstration. Supplying a document does not establish redistribution rights; the private study files are not included as general sample downloads.
- **Voices:** the four Kokoro voice-style binaries are upstream model assets bundled for local use, rather than project-trained voices. Whisper, MiniLM, and Qwen are upstream pretrained models.
- **Audio:** game effects are synthesized locally. The promo music and transition effects were generated by the project's production script; narration was synthesized locally with Kokoro Heart. No competitor music is used.
- **Promo visuals:** genuine Marginloom UI captures are cropped and animated alongside project-created motion graphics. The video is an edited product pitch, not a continuous real-time recording. Decorative timer and orb graphics are presentation elements.
- **Presentation inspiration:** the [NONON hackathon pitch](https://www.youtube.com/watch?v=zwAGvHim_kw) informed the promo's benefit headlines, device reveal, and task/result structure. Its footage, mascot, logo, and soundtrack are not included.
- **Fonts:** the app uses system fonts. Promo text is rendered using locally installed Windows Georgia and Segoe UI fonts; font files are not distributed with the project.

### Open educational study resources

The participant has selected the following third-party textbooks for download and import as precalculus and calculus study materials. They are credited to their original creators, not presented as Marginloom-authored content. This list does not mean the textbooks are bundled with the application or that they appeared in the existing demo video.

| Resource | Creator / publisher | Original source | License |
| --- | --- | --- | --- |
| *Precalculus: An Investigation of Functions*, 2nd edition, version 2.3 (2022) | David Lippman and Melonie Rasmussen | [Textbook and chapter downloads](https://www.opentextbookstore.com/precalc/) | [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/) |
| *Active Calculus: Single Variable*, 2nd edition (2025) | Matthew Boelkins, David Austin, Christina Safranski, and Steven Schlicker; Grand Valley State University Libraries | [Textbook and PDF download](https://scholarworks.gvsu.edu/books/34/); [online edition and workbooks](https://activecalculus.org/acs2e/) | [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/) |

Retain the downloaded resources' copyright, attribution, and license notices. For any redistributed chapter, excerpt, or adaptation, include its title, creators, original source URL, applicable license link, and a statement of changes. Distributed adaptations of either textbook must use its ShareAlike license. The precalculus textbook's separate detailed solutions manual has an Attribution-NonCommercial-ShareAlike license; do not assume the textbook license covers that manual. Separately credited images and other third-party items may have their own terms.

Downloading or importing an original file does not make it project-created content. If chapters are extracted, shortened, reformatted, or adapted into distributed study resources, record the specific chapters and changes alongside those resources. AI-generated explanations and practice questions are Marginloom outputs and should not be represented as statements authored or endorsed by the textbook creators.

## Cloud services and network use

Initial dependency and model downloads require internet access and contact package registries, Hugging Face, and MLC model artifact hosts. The hosted web version also needs an initial connection to fetch the app and currently requires the owning ChatGPT account to access its private deployment. The packaged Windows app does not require an account.

Core study inference has no cloud AI API dependency. Imported notes and recordings are not sent to a cloud inference endpoint. Raw voice recordings are not saved. The app has no analytics or remotely hosted fonts. Browser and hosting services still handle ordinary app-download/access traffic.

After setup, cached models restore without remote model downloads. Missing or cleared cache files require an online repair. Each browser origin, desktop app, and phone maintains separate data and model caches.

## Run or install

### Windows desktop

Open **[release/Marginloom-Setup-0.9.7.exe](release/Marginloom-Setup-0.9.7.exe)**, then launch Marginloom from its desktop shortcut, Start menu, or Windows Search. The runtime and interface are bundled; end users do not need Node.js or a terminal. This prototype installer is unsigned.

### Hosted phone / web version

Open **[Marginloom](https://marginloom.agilemelon4.chatgpt.site/)** while online. The current hosted deployment is owner-private and requires sign-in for access.

- Android Chrome: use **Add to Home screen**, then the installation option if offered; browser wording may vary.
- iPhone Safari: use **Share → Add to Home Screen**.

This is an installable web app, not an Android APK or native iPhone package. Full phone AI generation requires a compatible secure-context WebGPU browser and sufficient memory; physical phone inference remains unverified. Source search and saved activities can be used without a tutor model. No requests are silently redirected to a laptop or cloud model.

### Source / developer version

Extract the entire project before launching it. Double-click `Start-Marginloom.cmd` and keep its terminal open. Include both `Start-Marginloom.cmd` and `Start-Marginloom.ps1` when sharing the source; the command launcher calls the PowerShell script. For development mode, run `Start-Marginloom.cmd -Development`. Alternatively, with Node.js and pnpm installed:

```powershell
pnpm install
pnpm build
pnpm preview --port 4173
```

Open `http://localhost:4173`. Use the production build for offline testing; `pnpm dev` uses a different origin and data store. Installation, launch troubleshooting, and detailed workflows are in [INSTALL.md](INSTALL.md), [MOBILE.md](MOBILE.md), and [USER_GUIDE.md](USER_GUIDE.md).

## Demonstrate the hackathon requirement

1. Import a short text-based document, confirm its name and subject, and ask a sourced question.
2. Open **Settings & offline setup**, download a tutor profile and embeddings while connected, and wait for the app files to be cached. Set up voice separately if demonstrating it.
3. Disconnect the network, close and reopen the app, and wait for saved AI to restore. For localhost testing, keep the local preview server running; the packaged desktop app needs no separate server.
4. Ask a **new** question and generate **new** practice content. Optionally import fresh TXT notes while disconnected and ask about them.
5. Open the original supporting passage to show that the response uses the student's local material.

A connection badge or replaying a saved answer alone is not evidence of offline inference. A fresh answer after disconnected restart is the meaningful demonstration.

The **[60-second submission video](output/Marginloom-Promo-Cinematic.mp4)** includes a real fresh answer generated with browser networking disabled. The **[1:55 walkthrough](output/Marginloom-Demo.mp4)** provides a more direct feature tour. Production details are in [output/promo-cinematic/README.md](output/promo-cinematic/README.md).

## Verification and limitations

The latest documented application check passed **35 unit tests** and the production build. Browser and packaged-desktop checks have exercised import, persistence, local inference, cached restoration, source inspection, games, study tools, and disconnected generation. These are development checks, not a performance benchmark of every device. See [VALIDATION.md](VALIDATION.md) for evidence and scope.

- AI can produce inaccurate explanations and questions. Source and format validation do not establish logical correctness; students should inspect the evidence.
- Topic suggestions use local text rules and phrase matching. They are not a complete semantic outline and may miss synonyms or implicit topics.
- Imports support text PDFs, TXT, Markdown, and pasted text, with a 20 MB / 100 PDF page limit. Scanned PDFs need external OCR.
- English retrieval and voice are the tested path; multilingual and Taglish behavior is unvalidated.
- Large model downloads and memory requirements remain. The detailed profile is not a promise of cloud-level reasoning or broad phone compatibility.
- Calendar reminders are in-app indicators, not background notifications while the app is closed.
- Reviewers export HTML and use the system print dialog for PDF; the tutor does not independently create a fully typeset PDF file.
- Clearing site/app data can erase notes and cached models. Backups transfer study records, not AI caches.
- The interactive engine supports defined elements, not unrestricted math, physical, or clinical simulations. It is a study aid, not a clinical decision tool.

## Hackathon build history and participant disclosure

**Participant confirmation needed before submission:** record the official event window and identify any code or assets that existed before that window. The screenshots require substantial implementation during the hackathon and disclosure of existing work; repository file timestamps alone cannot establish this.

| Submission detail | Status |
| --- | --- |
| Participant / team names | To be supplied by the participant. |
| Official hackathon start and end | To be confirmed by the participant. |
| Work completed during the event | Verify against the official window: app implementation and subsequent import, local AI, games, study tools, UI, packaging, and demo work. [RELEASE_NOTES.md](RELEASE_NOTES.md) and [VALIDATION.md](VALIDATION.md) document development changes. |
| Pre-existing project code / original assets | Participant must declare any that predate the event, or explicitly confirm none. |
| Existing third-party code / models / assets | Pretrained models, dependencies, icons, voice styles, and system fonts disclosed above. |
| AI-assisted development | OpenAI Codex / ChatGPT disclosed above; add any other tools actually used. |
| Assistance from people outside the hackathon | Participant must confirm their own compliance; this README does not certify it. |

The supplied rules allow AI-assisted development and existing open-source models/libraries, require disclosure of models/APIs/frameworks/major tools, require demonstrated meaningful local inference, and prohibit external assistance from people outside the event. Any eligibility statement must match the participant's actual history.





## Subject-based study

Chat, Practice and Games choose a subject and use all material assigned to it. Original files and page citations stay separate. Subject labels are grouped ignoring capitalization and repeated spaces, with no inferred equivalence between different course names. Unconfirmed material remains unassigned; use the pencil beside a material to edit and confirm its subject. Import and pasted-note forms accept a subject. Optional exam focus can still narrow to particular files, topics or pages within the selection. Interactive lessons, guided sessions and reviewer drafts retain their individual-material selection within the chosen subject.

### Timed quiz reminders

The subject-linked calendar supports a quiz date/time, reminder lead time, editing and completion. In-app reminders work offline across tabs while the app runs and catch up when reopened. Optional device notifications require permission and a running app. For closed-app alarms, import the exported .ics event into a device calendar and confirm its alarm settings. See INSTALL.md for reminder conditions.
