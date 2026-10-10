# 0.9.7 — Marginloom launchers

- Renamed the source PowerShell launcher to `Start-Marginloom.ps1` and updated `Start-Marginloom.cmd` to call it directly.
- Removed the old `Start-Study-Buddy` launcher names. Include both Marginloom launcher files in source uploads.
- The command launcher forwards arguments such as `-Development` to the PowerShell script.
- Windows installer: `release/Marginloom-Setup-0.9.7.exe`.

# 0.9.6 — Submission audit

- Fixed Windows device-notification permission handling. Explicit calendar opt-in persists across restarts; unrelated origins remain blocked.
- Reject quiz questions that contain their marked answer; generation receives explicit answer guidance. Longer quizzes rotate through distinct sentences per passage while retaining original citations and topic filters.
- Windows installer: `release/Marginloom-Setup-0.9.6.exe`.

# 0.9.5 — Material shelf and timed quiz reminders

- Wider material shelf with padded headers and complete, wrapping filenames.
- Subject groups use normal page scrolling instead of a cropped nested list.
- Mobile shelves stack vertically, keeping file names and edit/delete controls accessible.
- Quizzes have a time, reminder lead time, editing and completion controls. Timed reminders appear across tabs and catch up when you reopen the app. Optional device notifications work while the app runs; .ics export delegates closed-app alarms to your calendar. Existing date-only entries remain intact and can be edited to add a time.
- Windows installer: `release/Marginloom-Setup-0.9.5.exe`.

# 0.9.4 — Charcoal dark mode and subject study

- Dark mode now uses neutral charcoal layers, soft ivory text and calmer borders, with selective green actions.
- Lavender navigation accents, warm notebook details and distinct shortcut colors give each learning tool an identity.
- Raised panels, subtle background depth, improved input separation and responsive icon treatments preserve readability.
- Chat, Practice and Games select subjects and combine their confirmed materials while keeping original citations. Library shelves group subjects, with editable subject assignments.
- Light mode colors are unchanged; reduced-motion and print styles are retained.
- Build script reuses the installed Electron runtime to avoid the Windows extraction rename failure.
- Windows installer: `release/Marginloom-Setup-0.9.4.exe`.

# 0.9.3 — Study navigation and longer quizzes

- Direct shortcuts for guided sessions, interactive lessons, teach-back and reviewers.
- Practice supports presets of 5, 10, 20, 30 or 50 questions and a custom count from 1–50.
- Question sources rotate across documents/pages; mistake prioritization is optional. Duplicate questions are skipped.
- Exam focus sits beside quiz setup. Progress and stopping after the current question retain completed questions.
- Short sources or failed quality checks may yield fewer questions; coverage is not exhaustive.
- Windows installer: `release/Marginloom-Setup-0.9.3.exe`.

# Marginloom 0.9.2 — Windows dark mode

The Windows installer has been rebuilt from the current source, including Light/Dark/System appearance. The packaging command now rebuilds the web interface before creating an installer. Use release/Marginloom-Setup-0.9.2.exe. Future application changes must also refresh the Windows release, as recorded in AGENTS.md.

# Dark mode — web / source update, October 10, 2026

Marginloom now supports Light, Dark, and System appearance. Use the sun/moon control in the top bar for a quick switch, or Settings → Appearance to follow your device. Preferences persist on this browser/device, synchronize across open tabs, and apply before React starts. Dark colors cover study, Practice, games, calendar, import/source/reviewer dialogs, and learning tools; printed reviewers retain a light page.

The hosted web app, source build, and Windows 0.9.2 installer include this update.

# Marginloom 0.9.1

Windows installer refreshed on October 10 with the latest web build, including the topic-detection fix below. Packaged web assets match the validated build; the packaged offline lesson/session and microphone cleanup/recovery checks passed. Install release/Marginloom-Setup-0.9.1.exe for the current PC version.

Mobile web follow-up: topic suggestions now reject vague page references such as “All values here” and use the source concept “hexadecimal” when that is the factual predicate. Suggestions still use local source-text rules rather than the selected chat model. The Windows 0.9.1 installer includes this follow-up. Phone installation and backup-transfer steps are in MOBILE.md.

The sidebar leaf and a quiet original quote are back, including with a full library. Material selectors, long-name tooltips, active navigation, keyboard focus and phone touch controls received a final layout pass. Optional controls remain tucked away rather than adding more tabs.

Teach it back now has a voice orb. After setting up the microphone, tap the orb to record and tap again to stop. It responds to input volume, shows thinking/transcribing states, and animates during tutor playback. Read and edit the transcript before sending; the orb does not remove that accuracy check. Reduced-motion preferences disable animation.

For more natural speech, open Learn together → Teach it back → Voice options. Choose Heart, Bella, Puck or Emma, then Set up natural voice. One optional Kokoro model download serves all four voices. Enable Read tutor responses aloud. Preview and Stop controls let you listen before using it. Installed local device voices remain available without this download. Microphone recognition is a separate optional Whisper download.

Kokoro generates speech locally on CPU in an isolated worker. Long replies are split into small phrases without dropping the remainder. Audio can begin before the whole reply is synthesized. The speech model is released after generation; microphone and tutor model work is sequenced to limit resource contention. First playback can take a few seconds, and speed varies by device. Voice style files and runtime code are bundled with the offline app. Saved-model restoration cannot silently redownload missing remote files.

Recovery fixes: backups now preserve only this device's voice-installation flags, rather than importing another device's flags. Missing natural-voice cache files disable read-aloud and offer setup again. Closing a learning window stops capture/playback, releases its workers/audio context, and prevents an old task from clearing the busy state of a newly opened task. Voice processing no longer displays a misleading “Saving locally” toast. Import errors receive a clear in-dialog treatment.

The original Start-Marginloom.cmd still works. Its launcher installs newly needed dependencies when necessary and reopens an already-running Marginloom server instead of starting a second server on port 4173. Keep the original server terminal open. The optional Windows installer is release/Marginloom-Setup-0.9.0.exe.

Phone layout is tested in a 390-pixel browser viewport. Physical Android/iPhone voice and inference performance still need testing. This remains an AI study aid: generated questions and feedback need source checking.


