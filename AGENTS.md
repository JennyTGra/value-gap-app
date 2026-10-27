<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep focus timer UI in FocusSession and persistent task transitions in valuegap helpers; this isolates timer state from navigation.
- Store task return notes and completion ownership in IndexedDB, using ambition IDs for notes/history with title fallback only for legacy rows; this preserves ownership through renames and reloads.
