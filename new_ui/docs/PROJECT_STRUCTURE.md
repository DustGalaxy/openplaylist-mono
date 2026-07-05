# Project Structure Analysis

## Current Shape

├── docs
│   ├── ModsGuide.md
│   ├── PROJECT_STRUCTURE.md
│   ├── THEME_GUIDE.html
│   ├── THEME_GUIDE.md
│   └── UI_GUIDE.md
├── public
│   ├── locales
│   │   ├── en.json
│   │   ├── ru.json
│   │   └── ua.json
│   ├── config.js
│   ├── config.js.template
│   ├── donatex-icon.png
│   ├── favicon.ico
│   ├── logo192.png
│   ├── logo512.png
│   ├── manifest.json
│   ├── policy.html
│   ├── robots.txt
│   └── widget.html
├── src
│   ├── api
│   │   ├── settings
│   │   │   ├── chat-roles.ts
│   │   │   ├── content.ts
│   │   │   └── donation.ts
│   │   ├── api-playlist.ts
│   │   ├── api-user.ts
│   │   └── io-sockets.ts
│   ├── components
│   │   ├── dnd
│   │   │   ├── DragGhost.tsx
│   │   │   ├── ReorderableList.tsx
│   │   │   └── ReorderRail.tsx
│   │   ├── layout
│   │   │   ├── Footer.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── menu-dropdown.tsx
│   │   │   └── RootError.tsx
│   │   └── ui
│   │       ├── accordion.tsx
│   │       ├── button-group.tsx
│   │       ├── button.tsx
│   │       ├── checkbox.tsx
│   │       ├── content-switch.tsx
│   │       ├── currency-selector.tsx
│   │       ├── date-chip.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── duration-chip.tsx
│   │       ├── funny-btn.tsx
│   │       ├── horizontal-scroll-strip.tsx
│   │       ├── info-card-group.tsx
│   │       ├── info-card.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── my-btn.tsx
│   │       ├── priority-chip.tsx
│   │       ├── radio-group.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── sonner.tsx
│   │       ├── switch.tsx
│   │       ├── tabs.tsx
│   │       ├── textarea.tsx
│   │       ├── TimeAgo.tsx
│   │       ├── toggle-group.tsx
│   │       ├── toggle.tsx
│   │       └── tooltip.tsx
│   ├── features
│   │   ├── auth
│   │   │   ├── AuthNav.tsx
│   │   │   ├── AuthPage.tsx
│   │   │   ├── index.ts
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── SocialAuthButtons.tsx
│   │   ├── dashboard
│   │   │   └── DashboardPage.tsx
│   │   ├── landing
│   │   │   ├── home-page.tsx
│   │   │   └── styles.ts
│   │   ├── playlist
│   │   │   ├── components
│   │   │   │   ├── bar.tsx
│   │   │   │   ├── LogPanel.tsx
│   │   │   │   ├── newPlaylistModal.tsx
│   │   │   │   ├── order-counter.tsx
│   │   │   │   ├── order-mini-card.tsx
│   │   │   │   ├── Playlist.tsx
│   │   │   │   ├── saved-list.tsx
│   │   │   │   ├── sortPanel.tsx
│   │   │   │   ├── TrackCard.tsx
│   │   │   │   ├── warningModal.tsx
│   │   │   │   └── YoutubePlayer.tsx
│   │   │   └── context
│   │   │       └── playlist-context.tsx
│   │   ├── public-playlist
│   │   │   └── components
│   │   │       ├── addbar.tsx
│   │   │       ├── search-playlist.tsx
│   │   │       ├── searchbar.tsx
│   │   │       ├── view-track-card.tsx
│   │   │       └── ViewInfoBar.tsx
│   │   ├── settings
│   │   │   └── components
│   │   │       └── playlist-settings
│   │   │           ├── block-list.tsx
│   │   │           ├── chatRoleItem.tsx
│   │   │           ├── donationItem.tsx
│   │   │           ├── platformChatRolesTab.tsx
│   │   │           ├── platformDonationTab.tsx
│   │   │           ├── platformValidationTab.tsx
│   │   │           ├── playlist-details-form.tsx
│   │   │           ├── settingsModal.tsx
│   │   │           ├── tabBasic.tsx
│   │   │           ├── tabBlock.tsx
│   │   │           ├── tabChatPlatformRoles.tsx
│   │   │           ├── tabChatRoles.tsx
│   │   │           ├── tabDonation.tsx
│   │   │           ├── tabValidation.tsx
│   │   │           └── twitchPriority.tsx
│   │   └── user-settings
│   │       ├── botSettings
│   │       │   ├── registry.ts
│   │       │   └── types.ts
│   │       ├── components
│   │       │   ├── AccountTab.tsx
│   │       │   ├── BotSettingsModal.tsx
│   │       │   ├── IntegrationsTab.tsx
│   │       │   ├── ProfileTab.tsx
│   │       │   ├── UserSettingsPage.tsx
│   │       │   └── WidgetTab.tsx
│   │       └── index.ts
│   ├── hooks
│   │   ├── useAuth.tsx
│   │   ├── useAuthUrl.tsx
│   │   ├── useDeboucedEffect.tsx
│   │   ├── usePersonalRoom.tsx
│   │   ├── usePlstUpdates.tsx
│   │   └── useWindowDimensions.tsx
│   ├── integrations
│   │   └── tanstack-query
│   │       ├── layout.tsx
│   │       └── root-provider.tsx
│   ├── lib
│   │   ├── config
│   │   │   └── botSetingsConfig.ts
│   │   ├── constants
│   │   │   ├── currencies.ts
│   │   │   ├── roles.tsx
│   │   │   └── social_names.tsx
│   │   ├── strategies
│   │   │   ├── DaAuthStrategy.ts
│   │   │   ├── DonateXIntegrationStrategy.ts
│   │   │   ├── GoogleAuthStrategy.ts
│   │   │   ├── index.ts
│   │   │   └── TwitchAuthStrategy.ts
│   │   ├── authStrategyManager.ts
│   │   ├── authStrategyRegistry.ts
│   │   ├── axios.ts
│   │   ├── oauthConfig.ts
│   │   ├── playbackPosition.ts
│   │   ├── themes.ts
│   │   └── utils.ts
│   ├── routes
│   │   ├── da-callback.tsx.depricated
│   │   ├── dashboard.lazy.tsx
│   │   ├── dashboard.tsx
│   │   ├── email-confirm.tsx
│   │   ├── history.tsx
│   │   ├── index.tsx
│   │   ├── login.tsx
│   │   ├── logout.tsx
│   │   ├── oauth-callback.tsx
│   │   ├── policy.lazy.tsx
│   │   ├── policy.tsx
│   │   ├── register.tsx
│   │   ├── settings.tsx
│   │   ├── statistic.tsx
│   │   ├── twitch-callback.tsx.depricated
│   │   ├── view.tsx
│   │   └── __root.tsx
│   ├── stores
│   │   ├── musicStore
│   │   │   ├── helpers.ts
│   │   │   ├── index.tsx
│   │   │   ├── lifecycleSlice.ts
│   │   │   ├── playbackSlice.ts
│   │   │   ├── settingsSlice.ts
│   │   │   ├── socketSlice.ts
│   │   │   ├── trackSlice.ts
│   │   │   └── types.ts
│   │   ├── authStore.tsx
│   │   ├── musicStore.tsx.deprecated
│   │   └── savedStore.tsx
│   ├── types
│   │   ├── botSettings.ts
│   │   ├── playlist.ts
│   │   ├── playlistLog.ts
│   │   ├── user.ts
│   │   └── utils.ts
│   ├── i18n.ts
│   ├── main.tsx
│   ├── reportWebVitals.ts
│   ├── routeTree.gen.ts
│   └── styles.css
├── .cta.json
├── .cursorrules
├── .dockerignore
├── .gitignore
├── .prettierignore
├── components.json
├── Dockerfile
├── eslint.config.js
├── index.html
├── nginx.conf
├── package-lock.json
├── package.json
├── prettier.config.js
├── README.md
├── tsconfig.json
└── vite.config.ts

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
