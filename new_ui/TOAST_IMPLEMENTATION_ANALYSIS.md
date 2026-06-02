# Toast Implementation Analysis

## Executive Summary

**Analysis Date:** 2026-06-02  
**Workspace:** src/features/ and src/components/  
**Total Files Analyzed:** 20+ component files  
**High Priority Missing Toasts:** 10 files identified

---

## TOP 10 PRIORITY FILES NEEDING TOAST IMPLEMENTATIONS

### 1. **addbar.tsx** (CRITICAL - HIGH FREQUENCY)

- **Path:** `src/features/playlist/components/addbar.tsx`
- **User Action:** Adding tracks to playlist (most frequent user action)
- **Current Status:** ❌ NO TOAST
- **API Functions Called:** `requestAddTrack(playlistId, youtubeurl)`
- **Impact:** High - Users add tracks constantly, need feedback on success/failure
- **Current Behavior:** Silent - no user feedback on add result
- **Suggested Toast Types:**
  - ✅ Success: "Track added to queue"
  - ❌ Error: "Failed to add track"
  - ⚠️ Warning: "Invalid URL"

---

### 2. **bar.tsx / PlaylistQueueInput** (CRITICAL - HIGH FREQUENCY)

- **Path:** `src/features/playlist/components/bar.tsx`
- **User Action:** Searching and adding tracks with dual-mode input
- **Current Status:** ❌ NO TOAST
- **API Functions Called:** `requestAddTrack(playlist.id, value.trim())`
- **Impact:** High - Primary track addition interface
- **Current Behavior:** Silent - no feedback on submission
- **Suggested Toast Types:**
  - ✅ Success: "Track request submitted"
  - ❌ Error: "Could not add track to queue"
  - ⚠️ Warning: "Please enter a valid URL or search term"

---

### 3. **newPlaylistModal.tsx** (CRITICAL - PLAYLIST CREATION)

- **Path:** `src/features/playlist/components/newPlaylistModal.tsx`
- **User Action:** Creating new playlists
- **Current Status:** ❌ NO TOAST
- **API Functions Called:** `createNewPlaylist(name, description)`
- **Impact:** High - Important operation, users need confirmation
- **Current Behavior:** Dialog closes silently, no confirmation
- **Suggested Toast Types:**
  - ✅ Success: "Playlist '{{ name }}' created successfully"
  - ❌ Error: "Failed to create playlist"
  - ⚠️ Warning: "Name and description are required"

---

### 4. **AccountTab.tsx** (HIGH - USER CRITICAL DATA)

- **Path:** `src/features/user-settings/components/AccountTab.tsx`
- **User Action:** Profile updates, password changes, avatar updates
- **Current Status:** ⚠️ PARTIAL - Uses feedback UI (not toasts)
- **API Functions Called:**
  - `updateUserProfile({ username, email, profile_image_url })`
  - `updateUserPassword({ currentPassword, newPassword })`
- **Impact:** High - Critical user data operations
- **Current Behavior:** Uses inline feedback UI instead of toasts
- **Suggested Toast Types:**
  - ✅ Success: "Profile updated successfully"
  - ✅ Success: "Password changed successfully"
  - ✅ Success: "Avatar updated"
  - ❌ Error: "Failed to update profile"
  - ⚠️ Warning: Validation errors

---

### 5. **ProfileTab.tsx** (HIGH - SOCIAL LINKS)

- **Path:** `src/features/user-settings/components/ProfileTab.tsx`
- **User Action:** Adding/deleting social media links
- **Current Status:** ⚠️ PARTIAL - Uses feedback UI (not toasts)
- **API Functions Called:** `patchSocialLink(updatedSocials)`
- **Impact:** High - User profile customization
- **Current Behavior:** Uses inline feedback UI for errors/success
- **Suggested Toast Types:**
  - ✅ Success: "Social link added"
  - ✅ Success: "Social link removed"
  - ❌ Error: "Failed to update social links"
  - ⚠️ Warning: "Duplicate platform" / Validation errors

---

### 6. **IntegrationsTab.tsx** (HIGH - BOT CONNECTIONS)

- **Path:** `src/features/user-settings/components/IntegrationsTab.tsx`
- **User Action:** Connecting/disconnecting bots and account integrations
- **Current Status:** ❌ NO TOAST - Silent failures
- **API Functions Called:**
  - `connectBot(platform, platform_user_id)`
  - `deleteIntegration(platform, platformUserId)`
- **Impact:** High - Integration management, needs clear feedback
- **Current Behavior:**
  - Success: UI updates (no message)
  - Failure: Console error only
- **Suggested Toast Types:**
  - ✅ Success: "{{ platform }} bot connected successfully"
  - ❌ Error: "Failed to connect {{ platform }} bot"
  - ✅ Success: "{{ platform }} integration removed"
  - ❌ Error: "Failed to disconnect integration"

---

### 7. **donationItem.tsx** (MEDIUM - DONATION RULES)

- **Path:** `src/features/settings/components/playlist-settings/donationItem.tsx`
- **User Action:** Editing donation rules (amount, priority, currency)
- **Current Status:** ❌ NO TOAST - Silent saves
- **API Functions Called:** `updateDonation({ playlist_id, data: localRule })`
- **Impact:** Medium-High - Important settings, users need confirmation
- **Current Behavior:**
  - Silent save with opacity change
  - Error: Reverts state silently
- **Suggested Toast Types:**
  - ✅ Success: "Donation rule saved"
  - ❌ Error: "Failed to save donation rule"
  - ⚠️ Info: "Saving..." (optional)

---

### 8. **tabBasic.tsx** (MEDIUM - PLAYLIST MODE & SOURCES)

- **Path:** `src/features/settings/components/playlist-settings/tabBasic.tsx`
- **User Action:** Setting playlist mode, toggling allowed sources
- **Current Status:** ❌ NO TOAST - No feedback
- **API Functions Called:**
  - `getUserIntegrations()`
  - Indirectly: `requestPlSettings(playlist.id, settings)`
- **Impact:** Medium - Configuration changes need confirmation
- **Current Behavior:** Changes UI state, no save feedback
- **Suggested Toast Types:**
  - ✅ Success: "Playlist mode updated"
  - ✅ Success: "Source permissions updated"
  - ❌ Error: "Failed to update settings"

---

### 9. **order-card.tsx** (MEDIUM - TRACK ACTIONS)

- **Path:** `src/features/playlist/components/order-card.tsx`
- **User Action:** Remove tracks, copy URLs, save tracks
- **Current Status:** ✅ PARTIAL - Has some toasts (copy, remove)
- **API Functions Called:**
  - `requestRemoveTrack(playlist.id, track.id, 'removed')`
  - `requestAddTrack(playlist.id, track_url)` (non-playlist buttons)
- **Impact:** Medium - Some toasts present, but missing on add for non-playlist view
- **Current Behavior:**
  - ✅ Copy: Shows "Copied!" toast
  - ❌ Add track (non-playlist): Silent
  - ❌ Remove: Silent
- **Suggested Toast Types:**
  - ✅ Success: "Track removed from queue"
  - ❌ Error: "Failed to remove track"

---

### 10. **settingsModal.tsx** (MEDIUM - SETTINGS SAVE)

- **Path:** `src/features/settings/components/playlist-settings/settingsModal.tsx`
- **User Action:** Saving playlist settings and details
- **Current Status:** ✅ PARTIAL - Has toasts but incomplete
- **API Functions Called:**
  - `requestPlSettings(playlist.id, settings)`
  - `requestPlaylistPatch(plst.id, obj)`
  - `deletePlaylist(playlist.id)`
- **Impact:** Medium - Has feedback but delete operation missing toast
- **Current Behavior:**
  - ✅ Settings saved: Shows success toast
  - ✅ Settings failed: Shows error toast
  - ❌ Playlist deleted: No confirmation/feedback
- **Suggested Toast Types:**
  - ✅ Add to delete: "Playlist deleted successfully"
  - ❌ Add to delete failure: "Failed to delete playlist"

---

## ADDITIONAL FILES NEEDING ATTENTION

### Block/Unblock Operations (Already Have Some Toasts)

- **block-list.tsx** - ✅ Has toasts for unblock operations
- **tabBlock.tsx** - ✅ Has toasts for block operations
- **tabDonation.tsx** - ✅ Has toasts for create/delete operations
- **chatRoleItem.tsx** - ✅ Has toasts for delete operations

---

## IMPLEMENTATION SUMMARY BY CATEGORY

### Track Operations (3 files - CRITICAL)

| File           | Action                  | Status      | Priority    |
| -------------- | ----------------------- | ----------- | ----------- |
| addbar.tsx     | Add track               | ❌ NO TOAST | 🔴 CRITICAL |
| bar.tsx        | Add track (queue input) | ❌ NO TOAST | 🔴 CRITICAL |
| order-card.tsx | Remove/Add track        | ⚠️ PARTIAL  | 🟡 MEDIUM   |

### Playlist Operations (2 files - HIGH)

| File                 | Action               | Status      | Priority    |
| -------------------- | -------------------- | ----------- | ----------- |
| newPlaylistModal.tsx | Create playlist      | ❌ NO TOAST | 🔴 CRITICAL |
| settingsModal.tsx    | Save/Delete playlist | ✅ PARTIAL  | 🟡 MEDIUM   |

### User Settings (2 files - HIGH)

| File           | Action           | Status         | Priority |
| -------------- | ---------------- | -------------- | -------- |
| AccountTab.tsx | Profile/Password | ⚠️ FEEDBACK UI | 🔴 HIGH  |
| ProfileTab.tsx | Social links     | ⚠️ FEEDBACK UI | 🔴 HIGH  |

### Integrations (2 files - HIGH)

| File                | Action                 | Status      | Priority  |
| ------------------- | ---------------------- | ----------- | --------- |
| IntegrationsTab.tsx | Bot connect/disconnect | ❌ NO TOAST | 🔴 HIGH   |
| tabBasic.tsx        | Playlist sources       | ❌ NO TOAST | 🟡 MEDIUM |

### Settings Management (1 file - MEDIUM)

| File             | Action                | Status      | Priority  |
| ---------------- | --------------------- | ----------- | --------- |
| donationItem.tsx | Update donation rules | ❌ NO TOAST | 🟡 MEDIUM |

---

## IMPLEMENTATION CHECKLIST

### PHASE 1: Critical (Affects daily UX)

- [ ] `addbar.tsx` - Add success/error toasts
- [ ] `bar.tsx` - Add success/error toasts
- [ ] `newPlaylistModal.tsx` - Add success/error toasts
- [ ] `AccountTab.tsx` - Replace feedback UI with toasts
- [ ] `ProfileTab.tsx` - Replace feedback UI with toasts

### PHASE 2: High Priority (Important operations)

- [ ] `IntegrationsTab.tsx` - Add success/error toasts
- [ ] `donationItem.tsx` - Add success/error toasts
- [ ] `tabBasic.tsx` - Add success/error toasts
- [ ] `order-card.tsx` - Complete missing toasts for add/remove
- [ ] `settingsModal.tsx` - Add delete confirmation toast

### PHASE 3: Validation & Polish

- [ ] Audit all toast messages for consistency
- [ ] Add loading toasts for long-running operations
- [ ] Test error scenarios
- [ ] Verify i18n keys exist for all messages

---

## IMPLEMENTATION NOTES

### Toast Library

- **Currently Used:** `sonner` (already imported in multiple files)
- **Import:** `import { toast } from 'sonner'`
- **Usage:** `toast.success()`, `toast.error()`, `toast.loading()`, `toast.promise()`

### Translation Keys Pattern

- Files use `useTranslation()` and i18n keys
- Key pattern: `playlistSettings.block.userBlockedSuccess`
- Example: `toast.success(t('settings.account.profileUpdated'))`

### Error Handling Pattern

Most files have access to errors via:

- `.catch((error) => {})` blocks
- API responses with `.response.data.detail` for error messages
- See `AccountTab.tsx` for `getApiErrorMessage()` utility pattern

### Debounced Operations

Several files use `useDebouncedEffect`:

- `donationItem.tsx` - 2000ms debounce
- `chatRoleItem.tsx` - 2000ms debounce
- Consider adding "Saving..." toast for visibility

---

## ESTIMATED EFFORT

- **Phase 1 (5 files):** 2-3 hours
- **Phase 2 (5 files):** 2-3 hours
- **Phase 3 (Polish):** 1-2 hours
- **Total:** 5-8 hours

---

## FILES ALREADY PROPERLY IMPLEMENTED ✅

The following files already have good toast implementations:

- `settingsModal.tsx` - Success/error for settings
- `tabBlock.tsx` - Block operations feedback
- `block-list.tsx` - Unblock operations feedback
- `tabDonation.tsx` - Create/delete rules feedback
- `chatRoleItem.tsx` - Chat role delete feedback
- `playlist-details-form.tsx` - Validation feedback
- `Playlist.tsx` - Share functionality feedback
- `order-card.tsx` - Copy feedback (partial)
