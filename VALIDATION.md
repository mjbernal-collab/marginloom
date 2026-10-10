# Validation record

October 10 mobile publication preparation: all 35 unit tests and the production build passed. An isolated Edge check confirmed that “All values here are hexadecimal” suggests “hexadecimal” rather than the page reference, and verified topic selection, citations, label edits, reload persistence, and 390-pixel layout. Physical phone installation and hosted offline behavior remain to be checked on the target devices.

Validated on October 9, 2026 with the bundled Node runtime and an isolated Microsoft Edge browser profile. This is development verification, not a benchmark of the user's Lenovo Legion or a physical phone.

## Passed

- Nine core tests: chunk overlap and page identity, scoped source retrieval, absence of keyword matches, embedding compatibility, quiz structure and evidence validation, citation mapping, mistake prioritization, constrained source answer phrases, preservation of Java package names/decimals, and rejection of partial-word answer matches.
- Production build and generated PWA manifest/service worker.
- Windows launcher PowerShell syntax.
- Browser import of pasted notes, TXT, and a two-page text PDF.
- Import validation errors are visible inside the open import dialog, with successful retry afterward.
- Original source inspection and document selection.
- Document persistence across page reload.
- Quiz UI scoring, session persistence, wrong-answer storage, and clearing a mistake after a subsequent correct answer. The UI-only check used an explicit test fixture.
- Document deletion and removal of associated practice records.
- Desktop and 390-pixel mobile layouts; no horizontal overflow on the tested mobile viewport.
- Offline app restart and source search.
- Actual local embedding inference and language model inference in browser workers.
- Actual quiz generation using Qwen2.5-1.5B-Instruct-q4f16_1-MLC (Balanced).
- With the browser network disabled: close the tab, reopen the app, reload both models from cache, and generate a fresh sourced answer.
- Import and semantically index new physics notes while disconnected, then generate a new quiz from those notes.
- Import the user's four-page `Java_Reviewer_Expanded.pdf`, index it, and answer a buffered-stream question while disconnected.
- Inject embedding query and indexing failures: keyword retrieval continues, imported material is retained, and the AI setup button permits recovery. Cached models reload successfully after the injected query failure.

## Bug fixes from the October 9 audit

- The launcher explains how to extract the complete ZIP when its companion PowerShell file is missing.
- Sentence extraction preserves Java package names and decimal values instead of losing text around internal periods.
- Quiz answer validation requires complete word boundaries, preventing a fragment such as `roma` from matching `stroma`.
- Import errors appear inside the open dialog.
- Embedding failures fall back to source search and preserve new documents; setup can retry when semantic search is unavailable even if the tutor remains loaded.
- A single oversized token is retained as source text during indexing rather than silently dropping its passage.

## Marginloom redesign verification

The renamed app and notebook layout passed the production build and browser flow checks after the redesign. Desktop and 390-pixel phone screenshots were inspected. Import, source inspection, persistence, quiz scoring, mistake review, and disconnected restart/source search passed with no browser runtime errors or horizontal page overflow. The manifest, favicon, and installation icons use the new identity. Existing IndexedDB names were retained to preserve saved data.

## Automatic offline AI restoration

Saved AI now restores automatically on the study desk after reopening. Restoration uses a cache-only worker mode that blocks remote model fetches, while allowing bundled runtime assets from the app origin. Setup distinguishes first download, loading saved AI, and repair after missing files.

`scripts/check-restore.mjs` passed a full browser shutdown and offline relaunch in the isolated Edge profile, automatic model restoration, and fresh quiz generation without visiting setup. No requests to external hosts and no page runtime errors were observed during that offline run. Production build, nine core tests, and the general browser flow checks also passed.

## Windows desktop packaging

Built a Windows x64 NSIS installer with Electron 44.7.0 and electron-builder 26.15.3. The installer is configured for per-user installation, desktop and Start-menu shortcuts, uninstall support, and the Marginloom notebook icon. The packaged executable bundles the web interface and runtime and uses a secure local protocol, with no HTTP server or Node.js installation needed by end users.

The actual packaged executable passed launch, secure-context/WebGPU detection, sandboxed-renderer checks, source inspection, real Compact-model inference, full application shutdown, automatic cache restoration with network access disabled, and a fresh offline answer. Tests used an isolated desktop profile. The installer was generated; its install/uninstall flow was not executed against the user's Windows account. The prototype is unsigned.

Phone installation metadata and the Apple home-screen icon were added. Native APK/iPhone packages and physical-phone inference are not included or validated in this desktop release.

## Games tab verification

Added Word Trail and Memory Match with optional locally synthesized sounds. Source mode uses exact document sentences; local-AI mode writes short recall questions for answers copied from the selected notes. Original evidence and source inspection remain available. Game sets use a new IndexedDB store and do not write Practice sessions or mistakes.

The production build and all 13 unit tests passed. `scripts/check-games.mjs` passed real source-deck generation, repeated-letter solving, full Memory Match completion, sound/mute behavior, source inspection, preservation of game state when switching tabs, separate Practice scores, 390-pixel layout without horizontal overflow, disconnected reload/replay of saved sets, and deletion of dependent game sets. Screenshots were inspected.

`scripts/check-games.mjs --ai` passed actual local-model game generation with browser network access disabled, both game completions, sound controls, citations, mobile layout, and saved-set reload. That AI test used an isolated persistent profile, refreshed its app assets, and reloaded online at the end; the separate source-mode test verifies disconnected shell navigation and the shared saved-game loading path. AI questions can still be inaccurate or incomplete even when their answer and evidence checks pass.

`scripts/check-migration.mjs` passed the v1-to-v2 upgrade with existing documents, sessions, mistakes and settings intact. The general import/search/Practice/mistake-review/offline-shell browser checks also passed. The packaged desktop executable passed a Games-tab build and memory-board check, alongside secure-context/GPU and source-search checks. Updated Windows installer: `release/Marginloom-Setup-0.3.0.exe`; install/uninstall remains untested on the user's account. No physical phone performance claim is made.

## Word Trail improvements and flashcards

Fixed title-derived answers by using factual sentence subjects instead of picking the longest word. Reviewer/module/chapter/group headings and generic connector subjects are skipped. Saved decks now carry generation version 2; older decks ask for a rebuild rather than replaying known poor clues. This is a conservative extraction rule, not a guarantee that every AI question is correct.

Word Trail supports removing any selected letter, progressive prefix hints, and a points total: 100 base points plus a 300-point bonus, reduced by 5 per active second and 75 per hint. The bonus cannot become negative. Revealing an answer awards no points. The timer pauses outside Games and in hidden tabs. Memory Match uses a 3D card flip with reduced-motion support. Flashcards share the sourced deck, reveal answers and evidence, requeue cards for another look, track self-reported recall, and complete when all cards are marked remembered.

Production build and all 15 unit tests passed. `scripts/check-game-improvements.mjs` imported the actual supplied Java reviewer PDF and passed heading regression/old-deck invalidation, letter removal, hints, bonus scoring, tab pause, duplicate-award prevention, flip animation/reduced motion, flashcard reveal/requeue/completion/restart/source inspection, mobile layout and separate Practice records. Mobile screenshots were inspected. General Practice/import/mistake-review checks and disconnected saved-game replay also passed. Real local AI wrote new game clues while network access was disabled. Version 0.4.0 includes these changes in the desktop installer; its packaged executable passed game generation, flashcard reveal/review, secure-context/GPU and source-search checks.

## Question-heading regression and keyboard entry

Deck generation version 3 rejects source questions (including the reported “How are full adders combined?”), question-word/pronoun subjects, and cut-off clauses. `makeGameCard` checks that the selected answer is the concept subject of a complete factual source statement. The same checks run on cached cards and AI-clue candidates; older or invalid saved decks request rebuilding. This addresses source-selection errors and does not establish semantic correctness of every model-written question.

Word Trail accepts keyboard text as well as tiles, synchronizes both input methods, supports Backspace and Enter, and renders separate word groups and visible hyphens. Case, spaces and hyphens are ignored only for answer checking. All 16 unit tests and the production build passed. The actual Java PDF regression/game checks and disconnected replay checks passed. `scripts/check-trail-keyboard.mjs` verified the question-heading regression, “Assembly language” word gap, mixed keyboard/tile input, letter removal, Backspace, Enter, optional spaces, round reset and 390-pixel layout. Desktop and phone-layout screenshots were inspected.

## Observed limits

Compact (0.5B) answered sample questions and generated some sample quizzes, but also produced attempts that failed answer-choice validation. Balanced also had rejected attempts; the app retries or skips them. A quiz can contain fewer questions than requested when there are too few usable passages or generated attempts fail checks. The UI reports that condition.

Source presence and format checks do not establish that an explanation is logically correct. The user should inspect the original passage. Small models can still produce misleading questions or answers.

Physical phone inference, battery use, device temperature, sustained latency, and target Lenovo Legion GPU memory use have not been measured. Mobile AI requires HTTPS or another browser-recognized secure context, WebGPU support, and sufficient memory.

Offline tests used Playwright's browser-level network disconnection. Model caches and test fixture documents were kept in an isolated browser profile under ignored `.qa/`; they are not the user's ordinary browser library. The first real app setup still requires downloading the selected model in that browser.

## Study planning, review controls and reviewer export — 0.6.0

Production build and all 21 unit tests passed. New tests cover confirmed material-derived calendar subjects, date validation, flashcard intervals, stable correction identities/discarding, exam material/page/mistake filters, session-goal activity counts and backup validation before writes.

`scripts/check-study-tools.mjs` passed material-bound calendar setup with another subject rejected until confirmed, upcoming indicators, concept selection, correction persistence across rebuilding, scheduled flashcard ratings, goal completion, exam focus persistence, editable reviewer HTML/PDF export, full backup restore into a fresh profile, disconnected planner reload and 390-pixel layout without horizontal overflow. The A4 demo PDF was rendered and visually inspected. Export is through the browser/desktop print window; the demo PDF used a small labeled test chapter, not the user's full reviewer.

`scripts/check-study-ai.mjs` passed real cached local-model reviewer overview and mistake explanation with browser networking disabled. This checks operation, not correctness of every AI statement. Source passages remain visible and summaries are editable. An optional streaming callback bug was corrected during this check.

General UI/Practice/offline checks, actual Java PDF game regression checks, keyboard/multiword Word Trail checks and v1-to-v3 database migration passed. The 0.6.0 packaged desktop executable passed launch, secure-context/WebGPU, sandboxed renderer, game generation/flashcards and source inspection. Installer was built; install/uninstall and physical phone inference remain untested.

Calendar subject suggestions use material names and require user confirmation; they do not guarantee semantic subject classification. Reminder records contain a material ID, so an independent conflicting subject cannot be selected. Calendar alerts appear inside the app only. Backups merge validated records, replacing matching IDs, and exclude downloaded model caches. Review intervals use simple local rating rules rather than a validated learning-optimization algorithm.

## Topic-based Exam focus — 0.6.1

Production build and all 25 unit tests passed, including exact topic phrase matching, source suggestions, sentence-level restriction within a shared page, preservation of citation text, topic backup validation and stable game concept identities. The game concept picker no longer reshuffles source identities when saved corrections load, preventing selected concepts from unexpectedly disappearing.

`scripts/check-topic-focus.mjs` passed suggested-topic selection, matching-passage inspection, custom source phrase addition, label editing, reload persistence and 390-pixel layout without horizontal overflow. The screenshot was inspected. General import/Practice/mistake-review/offline-shell checks and the actual Java PDF game regression checks passed.

`scripts/check-study-ai.mjs` passed real cached local-model overview and mistake explanation with networking disabled. A newly generated topic-focused quiz used evidence containing the selected Chlorophyll concept. The isolated AI profile was refreshed online between the overview and scoped quiz checks; disconnected reload in that manipulated profile failed, so this script does not prove offline restart. The separate general UI check passed disconnected app restart in a fresh profile. Tests verify constraints and operation, not semantic correctness of every generated question.

Topic suggestions use factual subjects and short headings. Custom matching phrases must occur in the original material. Topic-label edits change display text only. Matching uses exact phrases and does not infer synonyms or implicit references. The quiz generator prefers a factual source concept as its answer, limiting arbitrary answer selection. Optional correction controls remain available.
The rebuilt 0.6.1 packaged executable passed game generation with four stable selected concepts, Memory Match, flashcard rating, secure-context/WebGPU, sandboxed renderer and source inspection. Installer install/uninstall was not exercised on the user account.

## Workspace UX and direct tile typing — 0.7.0

Production build and all 26 unit tests passed. Reviewer intent tests distinguish creation commands from questions about creating a reviewer. `scripts/check-ux.mjs` passed drag/drop staging before save, cancel without importing, editable material names/subjects, real sourced reviewer preparation from a chat command and HTML export, Practice-only collapsed topic controls, Games customization without the due-card button, direct tile keyboard input, Backspace, Enter, next-round reset, letter-button synchronization, exclusion of keystrokes while a dialog is open, and desktop/390-pixel layouts without horizontal overflow. Screenshots of the home, Practice, Games and Word Trail layouts were inspected.

The general source-search/import/PDF/Practice/mistake-review/offline restart checks passed. Actual Java reviewer PDF game regression checks passed, including scoring, hints, flip animation, flashcard rating and reduced motion. The topic focus selection/source-inspection/renaming/custom-phrase/reload checks passed after relocating the controls to Practice.

Both browsing and dropping files now stage copies of File objects before clearing the input. Testing exposed a deferred FileList reset bug in the first implementation; it was fixed and file-picker import passed. Subjects confirmed at import remain material-bound for calendar reminders. Batch imports remove successfully saved entries before retrying failures. Original filenames remain in metadata.

Review due cards is removed from the interface; stored rating schedules remain in backups. Word Trail uses a visually hidden native input only for accessibility/touch keyboard focus, and direct key events for desktop play. Physical phone soft-keyboard behavior and inference were not tested. Reviewer creation uses sourced concepts or quoted passage fallback, with optional AI overview; this workflow does not guarantee complete semantic coverage of a long document. PDF print code remains unchanged; this turn tested preparation and HTML export rather than re-rendering a PDF.
The full study-tools workflow also passed after the UI move: reminder subject binding, corrections, goals, ratings, editable reviewer HTML export, backup restore into a fresh profile, disconnected planner reload and phone layout. PDF rendering was disabled for this run. Re-selecting the current reviewer material now preserves the draft rather than clearing it. The packaged 0.7.0 executable passed reviewer preparation, Games/flashcard ratings, secure-context/GPU, sandboxing and source inspection; installer install/uninstall was not executed.
0.7.1 fixes accidental modal dismissal: the shared dialog no longer closes on background or padding clicks. The padding click dismissal was reproduced on 0.7.0. Production build and scripts/check-import-dialog.mjs passed subject text selection, selection dragged outside, padding/backdrop clicks preserving the form, Cancel/X/Escape, and named import. Existing explicit dialog-close controls remain available.
The same import-dialog regression also passed in the packaged Windows executable using an isolated profile. Updated installer: release/Marginloom-Setup-0.7.1.exe; install/uninstall was not exercised.

## Composable lessons, short sessions and voice teach-back — 0.8.0

Production build and all 32 unit tests passed. Learning UI is a separate on-demand chunk (~9.5 KB compressed plus ~1.2 KB CSS); the speech worker adds ~877 KB of app-shell assets, with speech weights a separate optional download. These sizes are not runtime memory or latency benchmarks.

`scripts/check-learning.mjs` passed actual source activities for Math, English and Nursing examples, arithmetic graph manipulation, evidence validation, session chat routing, phase/timer preservation and paused resume, recap, typed teach-back, 390-pixel layout and a cold offline reload that reopened the lazy learning window and a saved session. It uses a fresh browser context and waits for service-worker control before disconnecting. Clearing precaches underneath an existing active worker in an earlier test made that manipulated profile fail offline reload; this was not treated as proof of an app restart. Screenshots exposed a mobile dialog overflow and mismatched field alignment; both were corrected. An error boundary keeps the rest of the app accessible if a learning chunk cannot load.

`scripts/check-learning-ai.mjs --voice` passed with the actual cached local tutor and actual quantized Whisper Tiny in Edge: local AI composed validated source elements, generated teach-back feedback and answered a follow-up with network disabled. The speech model was initially downloaded explicitly into an isolated test profile; synthetic microphone turns transcribed locally with the network disabled, including a second turn after the speech worker had been terminated. The synthetic transcript contained omissions/misrecognition; tests establish working local inference, not guaranteed transcription accuracy. The transcript is editable before submission. AI feedback is not semantically verified; missing/invalid citations are flagged and mastery scores are not assigned. This AI test loads the UI before disconnecting; cold app-shell reopening is covered by the separate fresh-context test.

The existing UX regression script passed import staging/cancel/naming, chat reviewer preparation/export, Practice focus, decluttered Games, direct Word Trail keyboard interaction, and desktop/phone-width layouts. Formula parser tests reject executable code, missing parentheses, nonfinite results and oversized exponents. Session planning tests exclude other subjects' reminders/mistakes. Backup tests validate material references and session state before restoration.

The engine composes source reading, concept connections, annotation, explicitly numbered sequences and supported arithmetic graphs; it does not generate arbitrary executable programs, infer medical relationships, extract diagrams or validate open-ended clinical decisions. Voice is optional English, turn-based, capped at 60 seconds, and uses cache-only restoration after setup. Spoken replies require an installed local English voice. Physical Android/iPhone microphone behavior, speech speed, inference memory and continuous real-time conversation were not tested or promised.

Windows installer rebuilt as `release/Marginloom-Setup-0.8.0.exe`. It remains unsigned; installer install/uninstall was not exercised on the user account. The existing Start-Marginloom.cmd workflow remains supported.

`scripts/check-learning-desktop.mjs` passed in the packaged app with an isolated profile and network disabled through emulation: source lesson/session use, actual synthetic microphone capture, track cleanup after closing/stopping, and missing voice cache returning to setup without remote HTTP requests. The model itself was exercised in Edge; this fresh desktop profile tests permissions and failure handling rather than desktop speech-model inference. Electron's navigator.onLine hint remained true during network emulation, so the test checks absence of remote requests rather than relying on that hint. Hidden-window screenshot capture timed out and was removed from the functional test; browser layout screenshots were inspected separately.

Topic suggestions and source selection are memoized so session timer ticks do not rescan the document. The session planner loads only calendar events, avoiding unnecessary loading of saved decks and review records. Speech recognition and language-model generation remain sequential; performance on physical phones is still unverified.

Final regression testing caught the session-start button briefly rendering before asynchronous saved-session restoration finished. The learning window now shows its loading state until the selected document's saved session has been checked, preventing that transient action from competing with restoration.

## Final design and voice pass — 0.9.0 (October 10, 2026)

Production build and all 34 unit tests passed. Launcher PowerShell syntax parsed successfully. The signed-resource packaging tool completed an unsigned 0.9.0 NSIS installer (sign-tool log lines do not establish a publisher signature). Installer install/uninstall was not exercised on the user's account.

The browser UX suite passed import staging/cancel/metadata, chat reviewer generation and HTML export, Practice-only collapsed focus, Games customization, tile keyboard synchronization and mobile layout. Study tools passed material-bound reminders, corrections, goals, ratings, topic focus persistence, reviewer editing/export and backup restore. The actual Java PDF regression suite passed concept/title filtering, speed points, hints, letter removal, memory flips, reduced motion and flashcards. General UI checks passed source search, no-answer handling, fixture-based quiz scoring/mistake review, persistence and offline reload. Learning checks passed source compositions across Math/English/Nursing, checked arithmetic, evidence selection, session phases/resume/timer and cold offline reopening.

New final-polish checks passed visible invalid-PDF errors in the import dialog, long-name tooltip/selected state, backup voice flags staying device-local, every mobile tab without horizontal overflow and a 620px-high desktop sidebar. Packaged Windows checks passed subject-text selection without accidental dialog dismissal, microphone permissions, stationary orb record/stop, capture cleanup, source sessions and offline missing-model repair with no remote requests.

Actual Kokoro q8 synthesis/PCM playback passed in Edge and the packaged Windows app. Explicit setup, speaking/stop state, cold offline restart, preference persistence and switching to another bundled voice style passed with no remote requests offline. Model startup and CPU synthesis can take seconds; short preview preparation was roughly 14–19 seconds in these development runs under concurrent checks. This is not a Lenovo Legion or phone benchmark.

A fresh Edge profile passed explicit Whisper setup, a cold offline reload, two actual synthetic-microphone transcriptions after worker release and the clickable, volume-reactive orb, with no remote requests. Technical word recognition remains imperfect and transcripts stay editable. A separate older persistent QA profile failed worker startup after its service-worker registrations/caches were manually cleared: its cache lacked the speech worker file. That destructive fixture reset is not the normal offline installation flow; its combined --voice AI check is not counted as a pass. Fresh-profile cold recognition and the general cold offline app checks passed.

Natural voice model styles, runtime assets and worker code are bundled/precached; model weights remain an explicit optional download. Download flags in a restored backup cannot install voice files. Closing the learning window releases its microphone, speech workers, queued audio and AudioContext. Speech failures do not erase tutor feedback.

Phone layouts were inspected at 390px. Physical Android/iPhone microphone, speech synthesis, WebGPU inference and soft-keyboard behavior remain unverified. AI-generated study content is source-checked structurally, not guaranteed factually correct.

Final 0.9.0 actual local-AI check also passed: offline source-element arrangement, tutor feedback and follow-up. The recorded combined persistent-profile --voice fixture limitation remains separate from the passing fresh-profile speech check. Installer signature was verified as NotSigned.

## Dark mode — October 10, 2026

Production build and isolated Edge checks passed for Light/Dark/System controls, restart persistence, live system changes, explicit override, cross-tab synchronization, import/source dialogs, lazy learning window, source-mode game creation, Practice, and 390-pixel layout without overflow. Desktop and phone-layout screenshots were inspected. This does not establish physical-phone inference performance or update the existing Windows installer.

## 0.9.3 — Navigation and quiz length

All 37 Node checks pass, including 50-question generation orchestration with a deterministic generator, source rotation across documents/pages, duplicate/failure handling, and stopping with a partial set. These tests do not measure real-model quality or 50-question latency. The packaged app opens the four direct study tools, supports preset/custom quiz counts, disables empty input, clamps the maximum to 50, and places Exam focus inside setup. Web browser checks pass at 1440px and 390px with no horizontal overflow or runtime errors; screenshots inspected. Current installer and packaged asset verification are recorded after the final build below.
`release/Marginloom-Setup-0.9.3.exe` rebuilt successfully. All 28 packaged web files match final dist by SHA-256. Packaged shortcut, count and focus checks pass. Installer SHA-256: 8678FC174DCC43F6C470BF0B7180D3CBAA0D097CCD1244437378317C69752E8D; 125,515,493 bytes. No real-model 50-question timing/quality benchmark was performed.

## 0.9.4 — Charcoal palette and subject study

All 39 Node checks pass. Browser checks at 1440px and 390px cover dark/light switching, persisted theme preference, dialog and lazy-tool colors, contrast of semantic text and primary action colors, subject-wide retrieval with original citations from two files, isolation from another course, shared Practice/Games subject scope, subject editing and reload. Screenshots of the main screens and mobile layouts were inspected. This checks source search and grouping, not real-model synthesis quality.

The final standard build script succeeds using the installed Electron runtime to bypass a Windows archive-folder rename failure. Current installer: `release/Marginloom-Setup-0.9.4.exe`, 125,600,083 bytes, SHA-256 `FA326CA1716C822A8699DE1DF74CDCFB57564A522FF9191C1B182F5D80E02BDB`. All 28 packaged web assets match dist; packaged source grouping, citations, course isolation, 50-question control and subject editing pass. Offline full restart/theme persistence and Light/Dark settings pass in the equivalent versioned package. Final published assets match dist. Private web deployment succeeded for source `a60026249f7bdea7092bb9f735c79a82adaafa50`.

## 0.9.5 — Material shelf and timed reminders

43 Node tests pass, including reminder thresholds, catch-up, completion/dismissal, no-reminder mode, calendar alarm export and backup compatibility. Production browser checks cover seven long filenames and three subject shelves at 1920, 1440, 1024, 820 and 390 pixels in both themes: names wrap completely, all rows/actions remain inside the shelf, no nested vertical clipping and no horizontal page overflow. Packaged Windows checks cover the same shelf in both themes. All 28 packaged web assets match dist; subject grouping/citations/course isolation still pass.

Browser and offline packaged Windows UI checks pass for timed creation, linked subject, reminders across tabs, dismissal persistence, editing, completion and calendar export controls. Device notification construction is mocked to avoid sending real OS notifications; stored delivery marks prevent repeat delivery on reopening. Browser .ics download is verified; Windows download invocation is intercepted to avoid a native Save dialog. Actual OS/calendar alarm delivery and closed-device background behavior were not verified and depend on permissions/device settings. Existing date-only events require editing to add a time.

Current installer: `release/Marginloom-Setup-0.9.5.exe`, 125,602,565 bytes. SHA-256: `12937CCDC0EE332CD0C2BCA5127E40EB5EA0DB9A103C76A3C77A61524974A234`. Hosted package files match the final dist; source commit `eaa10ec6324ac700058546b5317621860214846b`.
# Launcher rename — 0.9.7

The renamed PowerShell script passed syntax validation. The actual `Start-Marginloom.cmd -Development` launcher started Vite and served the Study desk, confirming its renamed script dependency and argument forwarding. The web build and Windows installer build succeeded. All 28 packaged web assets matched `dist` by SHA-256 (excluding the service worker files intentionally omitted from desktop packaging), and the isolated packaged application launched with version 0.9.7. Installer output: `release/Marginloom-Setup-0.9.7.exe`. Install/uninstall was not rerun for this launcher-only change.

