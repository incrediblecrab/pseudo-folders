import * as vscode from 'vscode';
import { PseudoFoldersProvider } from './pseudoFoldersProvider';
import { PseudoFolderStorage } from './storage';

export function activate(context: vscode.ExtensionContext) {
    const storage = new PseudoFolderStorage(context);
    const provider = new PseudoFoldersProvider(storage);
    
    vscode.window.createTreeView('pseudoFolders', {
        treeDataProvider: provider,
        showCollapseAll: true,
        dragAndDropController: provider
    });

    vscode.commands.registerCommand('pseudoFolders.createFolder', async () => {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter pseudo folder name',
            placeHolder: 'My Folder'
        });
        
        if (name) {
            await provider.createPseudoFolder(name);
        }
    });

    vscode.commands.registerCommand('pseudoFolders.deleteFolder', async (item) => {
        const answer = await vscode.window.showWarningMessage(
            `Delete pseudo folder "${item.label}"?`,
            'Yes', 'No'
        );
        
        if (answer === 'Yes') {
            await provider.deletePseudoFolder(item.id);
        }
    });

    vscode.commands.registerCommand('pseudoFolders.renameFolder', async (item) => {
        const newName = await vscode.window.showInputBox({
            prompt: 'Enter new name',
            value: item.label,
            placeHolder: 'New Folder Name'
        });
        
        if (newName && newName !== item.label) {
            await provider.renamePseudoFolder(item.id, newName);
        }
    });

    vscode.commands.registerCommand('pseudoFolders.refresh', () => {
        provider.refresh();
    });
}

export function deactivate() {}