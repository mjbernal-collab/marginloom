# Install Marginloom

## Windows

1. Download `Marginloom-Setup-0.9.7.exe` from the `release` folder.
2. Open it and follow the installer. It installs for your Windows account; administrator access is not required.
3. Open **Marginloom** from the desktop shortcut, Start menu, or Windows Search.
4. In **Offline setup**, download your chosen AI model once. After that, saved AI opens automatically when you launch the app.

You do not need Node.js, a command prompt, a local server, or the source project. The app bundles its own runtime and interface. Only the installer needs to be shared; do not share the `win-unpacked` development folder.

This prototype installer is not code-signed, so Windows can display an unverified publisher notice. The installed application appears in Windows installed-app settings and can be uninstalled there. Uninstalling retains study data; clearing the app's saved data removes documents and models.

The desktop application uses its own storage. Documents and downloaded models from the earlier browser version remain in that browser and do not automatically transfer. Keep using the original browser to access those records; add the materials and set up AI once in the desktop application.

## Android and iPhone

The current phone version is an installable web app, using the same Marginloom logo. Open https://marginloom.agilemelon4.chatgpt.site while online and sign in with the owning ChatGPT account. See MOBILE.md for installation and backup transfer. `localhost` on your PC is not a phone deployment address.

- Android: open the HTTPS address in Chrome, then choose **Install app** from the browser menu.
- iPhone: open the HTTPS address in Safari, then **Share → Add to Home Screen**.

Download AI in the installed app on that phone before going offline. AI generation requires a compatible WebGPU browser and enough memory. Phone inference still needs verification on the target devices.

No Android APK or native iPhone package is included in this Windows release. The HTTPS web app installs from your phone browser. A native phone build requires platform-specific packaging and inference testing.

## Build a new Windows release

To launch the source version, keep `Start-Marginloom.cmd` and `Start-Marginloom.ps1` together in the project root, then double-click the command file. It installs dependencies when needed and builds the web app. For development mode, run `Start-Marginloom.cmd -Development`. The installed desktop application does not need these source launchers.

For developers with Node.js and pnpm installed:

```powershell
pnpm install
pnpm --dir desktop install
pnpm --dir desktop exec install-electron
pnpm package:windows
```

Installer output goes to `release/`. Sources and desktop dependency versions are recorded in the two lockfiles. Electron and electron-builder are disclosed desktop packaging tools.


## Quiz reminder conditions

Set a quiz date, time and reminder lead time in the Study desk calendar. Times use your device time zone when saved. In-app reminders work offline on every tab while Marginloom runs; checks happen every 30 seconds and on return. Missed reminders appear on your next visit until dismissed or completed. Optional device notifications require permission and the app running; sleep, background suspension and Do Not Disturb may delay or suppress them. For closed-app reminders, download and import the .ics event with its alarm into your device calendar and check that calendar’s settings. Editing or deleting an event in Marginloom does not update an already imported calendar event.
