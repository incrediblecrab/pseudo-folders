# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) and GitHub Copilot CLI when working in this repository.

Pseudo Folders is a VS Code extension that adds a "Pseudo Folders" Explorer view of virtual, nestable folders for grouping files without moving anything on disk. It is published on the Marketplace as `maxs-lab-of-things.pseudo-folders`. The repository is public.

## Commands

```bash
npm run compile      # tsc -p ./ -> out/
npm run watch
npm run package      # vsce package; read the printed file list
npm run publish      # vsce publish
```

Run the extension with F5 from VS Code. There are no tests and no lint script.

## Structure

`src/extension.ts` registers the six `pseudoFolders.*` commands; `src/pseudoFoldersProvider.ts` is the tree data provider. `src/storage.ts` (`PseudoFolderStorage`) persists everything to `.pseudo-folders.json` at the workspace folder root, writing a backup first, then a `.tmp` file that is re-parsed before it replaces the real file. `src/types.ts` defines the data and two limits: `MAX_NESTING_DEPTH` (10) and `CURRENT_DATA_VERSION` (2). The store is a file in the user's workspace, so a change to its shape must bump `CURRENT_DATA_VERSION` and migrate files written by earlier versions rather than reject them.

## Releasing

`.vscodeignore` is the only control over what ships in the `.vsix`; `.gitignore` is ignored by `vsce`. The managed block in it is rewritten by a standardizing script, so add project-specific exclusions outside that block. The README states the Marketplace version, so bump it with `package.json` and `CHANGELOG.md`. The publishing procedure is in `../README.md`.
