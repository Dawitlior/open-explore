# Trade Journal, market map, and Orca Coach upgrade

## What will change

1. **Trade Journal popup**
   - Render the trade dossier at the browser level instead of inside the animated journal surface.
   - Keep it centered in the visible desktop window, lock background scrolling while open, and preserve the mobile bottom-sheet behavior.

2. **News market map**
   - Replace generic market dots with circular country-flag markers for Australia, Japan, the UK, and the US.
   - Show a restrained green pulse around a marker only while that market is open.
   - Keep each marker clickable, keyboard accessible, and connected to its existing market-details popup.

3. **Orca Coach conversation history**
   - Replace the current “Chats” dropdown with a persistent Gemini/Claude-style conversation rail on desktop.
   - Include new chat, active state, titles, timestamps, deletion, empty state, and a compact mobile drawer.
   - Keep the existing five-conversation limit and per-user browser persistence.

4. **Pro floating AI assistant**
   - Add a Pro-only circular Orca Coach launcher across authenticated product screens.
   - Open a polished chat panel without forcing navigation away from the current channel.
   - Reuse the same conversations, portfolio selection, usage limits, and AI endpoint as the full Coach page; hide the launcher while the full Coach is open.

5. **Automatic context compaction**
   - Extend saved conversations with a private rolling memory summary.
   - When a conversation grows past a safe threshold, summarize older turns server-side, retain recent turns verbatim, and send both the summary and recent context on future messages.
   - Do not count background compaction as a user message; keep authentication, portfolio ownership checks, and AI error handling intact.

## Technical details

- Use a React portal for the trade dossier so transformed page transitions cannot reposition a fixed overlay.
- Use the existing local flag assets and theme tokens for map markers.
- Base the refreshed chat surface on AI Elements primitives, while preserving Orca styling and bilingual RTL/LTR behavior.
- Add a shared conversation state layer so the full page and floating panel never diverge.
- Update the existing `orca-coach` server function with a validated compaction action and bounded message sizes.

## Verification

- Desktop: open a gallery trade after scrolling and confirm the dossier is immediately centered and fully reachable.
- Map: verify all four round flags, pulse only on open markets, and popup positioning in both themes.
- Coach: create/switch/delete chats in the side rail, move between channels, reopen the floating assistant, and confirm the same thread is restored.
- Compaction: exceed the threshold, confirm older turns are replaced by memory plus recent turns, then ask a follow-up that depends on earlier context.
- Check desktop and mobile layouts, keyboard focus, type safety, and the live AI response path.
