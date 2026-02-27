# Devcontainer Codex Settings Persistence

Codex state now persists across container rebuilds by bind-mounting a host folder:

- Host path: `.devcontainer/local/codex`
- Container path: `/home/node/.codex`

On `postCreateCommand`, the container seeds missing files from `/opt/codex-seed` into `/home/node/.codex`.
This allows image-provided defaults (including `auth.json` from `.devcontainer/auth.json`) while keeping ongoing Codex permission/settings changes on the host.

## Notes

- `.devcontainer/local/codex` is git-ignored (except `.gitkeep`) so local settings are not committed.
- If you want to reset Codex state, remove files in `.devcontainer/local/codex` and rebuild/reopen the container.
