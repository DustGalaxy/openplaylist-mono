# Project Structure Analysis

## Current Shape

`new_ui` is a Vite, React, TypeScript, TanStack Router application. Routes are file-based, so `src/routes` should remain route-focused and stable. The old `src/components` folder had grown into a mixed bucket containing shared UI primitives, icons, layout, auth screens, playlist controls, public playlist views, and settings modal widgets.

## Reorganization

The source tree now separates shared infrastructure from feature-owned UI:

- `src/components/ui`: shared primitive components and small reusable UI controls.
- `src/components/icons`: shared generated icon components and raw source SVGs.
- `src/components/layout`: app shell/layout components such as the header and user menu.
- `src/features/auth`: login, register, auth navigation, social auth buttons, and auth feature exports.
- `src/features/playlist/components`: dashboard playlist management UI, track cards, player controls, saved list, sorting, and playlist creation.
- `src/features/public-playlist/components`: public playlist discovery and public playlist view components.
- `src/features/settings/components/playlist-settings`: playlist settings modal and its tab editors.

The route files stay in `src/routes` and import feature components through the `@/features/...` alias. Shared UI and icon imports use `@/components/...`, which avoids fragile relative paths when feature folders move again.

## UI consistency

See **[UI_GUIDE.md](./UI_GUIDE.md)** for colors, panels, typography, buttons, and page layout patterns used on the landing page, footer, and public `/view` route.

## Suggested Next Steps

- Keep new route files inside `src/routes` so TanStack Router can generate route metadata.
- Put feature-specific UI under `src/features/<feature-name>` instead of adding more files to the root of `src/components`.
- Keep `src/components` reserved for genuinely shared layout, primitives, and icons.
- Consider splitting `src/lib` later into `auth`, `http`, and shared utility modules, but avoid that until the current auth work settles.
