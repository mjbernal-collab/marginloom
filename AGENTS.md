# Marginloom project instructions

- After every application change (code, styling, assets, or app configuration), rebuild and verify the Windows installer in addition to updating the web build. This is an explicit user requirement.
- Increment the desktop package version for a new release. Run `node scripts/build-desktop.mjs` (or `pnpm --dir desktop package`), which builds the current web source before packaging it.
- Verify packaged assets match `dist`, check the packaged app for the changed behavior, and update README.md, INSTALL.md, and RELEASE_NOTES.md to name the current installer.
- Report the resulting installer path. If packaging is blocked, explicitly report that the desktop release is incomplete; do not silently leave an older installer as current.
