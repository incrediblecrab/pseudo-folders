# pseudo-folders

![Version](https://img.shields.io/visual-studio-marketplace/v/maxs-lab-of-things.pseudo-folders) ![MLoT](https://img.shields.io/badge/MLoT-ai-blue)

Pseudo Folders is a VS Code extension that adds an Explorer view for grouping workspace files and folders into virtual folders without moving the original paths. It is published on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=maxs-lab-of-things.pseudo-folders) as `maxs-lab-of-things.pseudo-folders`; the published version is 1.5.1, matching this repository.

![Demo](https://raw.githubusercontent.com/incrediblecrab/mlot-developer-media/main/gifs/pseudo-folders.gif)

**Objective:** give a workspace a second navigation structure for related files while leaving imports, source paths and Git history untouched.

**Inputs:** VS Code 1.74.0 or later and an open workspace folder. The extension stores its data in `.pseudo-folders.json` at the workspace root and keeps rotated `.pseudo-folders.backup.N.json` backups when saving.

**Files:**

- [`src/`](src/): the TypeScript extension source, tree view provider, storage layer and types
- [`package.json`](package.json): extension metadata, commands, view contributions and npm scripts
- [`CHANGELOG.md`](CHANGELOG.md): release history
- [`pseudo-folders.png`](pseudo-folders.png): Marketplace image asset
- [`tsconfig.json`](tsconfig.json): TypeScript compiler settings

**Try it:** install the published build with `ext install maxs-lab-of-things.pseudo-folders`. For local development, run `npm install`, then `npm run compile`, and launch the extension host from VS Code.

## Usage

Open a workspace folder, then open the "Pseudo Folders" view in Explorer. Use the toolbar to create a root pseudo folder and refresh the view.

Drag files or folders from the VS Code Explorer into a pseudo folder to add them. Drag a pseudo folder onto another pseudo folder to nest it. Drag a nested pseudo folder to the root of the Pseudo Folders view to move it back to the top level.

Pseudo folders can be renamed, deleted or given a child pseudo folder from the context menu. Deleting a pseudo folder removes only the virtual grouping; if it has child pseudo folders, they move to the root level. Files shown inside a real folder can be opened from the Pseudo Folders tree.

## Commands

| Command | Title | Where it appears |
| --- | --- | --- |
| `pseudoFolders.createFolder` | Create Pseudo Folder | Pseudo Folders view title |
| `pseudoFolders.refresh` | Refresh | Pseudo Folders view title |
| `pseudoFolders.renameFolder` | Rename Pseudo Folder | Pseudo folder inline menu |
| `pseudoFolders.createChildFolder` | Create Child Folder | Pseudo folder inline menu |
| `pseudoFolders.deleteFolder` | Delete Pseudo Folder | Pseudo folder inline menu |
| `pseudoFolders.copyPath` | Copy Path | Real folder and file context menu |

The real folder and file context menu also exposes VS Code's built-in `revealInExplorer`, `copyFilePath` and `copyRelativeFilePath` commands.

## Settings

Pseudo Folders does not contribute VS Code settings.

## Development

- `npm run compile`: compile TypeScript with `tsc -p ./`
- `npm run watch`: compile in watch mode
- `npm run package`: create a VSIX with `vsce package`
- `npm run publish`: publish with `vsce publish`

Do not publish from this repository unless the package metadata and Marketplace release are intentionally being updated.

## Links

- [Marketplace listing](https://marketplace.visualstudio.com/items?itemName=maxs-lab-of-things.pseudo-folders)
- [Demo video](https://youtu.be/2bqRat3q4HI)
- [MLoT product page](https://mlot.ai/pseudo-folders/)
- [Privacy policy](https://mlot.ai/privacy/)
- Publisher: [Max's Lab of Things](https://mlot.ai/)

## License

MIT. See [`LICENSE`](LICENSE).
