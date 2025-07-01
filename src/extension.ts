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
            placeHolder: 'My Folder',
            validateInput: (value) => {
                if (!value || !value.trim()) {
                    return 'Folder name cannot be empty';
                }
                if (value.length > 100) {
                    return 'Folder name too long (max 100 characters)';
                }
                if (/[<>:"/\\|?*]/.test(value)) {
                    return 'Folder name contains invalid characters';
                }
                return null;
            }
        });
        
        if (name && name.trim()) {
            try {
                await provider.createPseudoFolder(name.trim());
            } catch (error) {
                console.error('Error creating pseudo folder:', error);
                vscode.window.showErrorMessage('Failed to create pseudo folder');
            }
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
        if (!item || !item.id) {
            vscode.window.showErrorMessage('Invalid folder selected');
            return;
        }
        
        const newName = await vscode.window.showInputBox({
            prompt: 'Enter new name',
            value: item.label,
            placeHolder: 'New Folder Name',
            validateInput: (value) => {
                if (!value || !value.trim()) {
                    return 'Folder name cannot be empty';
                }
                if (value.length > 100) {
                    return 'Folder name too long (max 100 characters)';
                }
                if (/[<>:"/\\|?*]/.test(value)) {
                    return 'Folder name contains invalid characters';
                }
                return null;
            }
        });
        
        if (newName && newName.trim() && newName.trim() !== item.label) {
            try {
                await provider.renamePseudoFolder(item.id, newName.trim());
            } catch (error) {
                console.error('Error renaming pseudo folder:', error);
                vscode.window.showErrorMessage('Failed to rename pseudo folder');
            }
        }
    });

    vscode.commands.registerCommand('pseudoFolders.refresh', () => {
        provider.refresh();
    });

    vscode.commands.registerCommand('pseudoFolders.copyPath', async (item) => {
        if (item && item.realPath) {
            await vscode.env.clipboard.writeText(item.realPath);
            vscode.window.showInformationMessage(`Path copied: ${item.realPath}`);
        }
    });

    vscode.commands.registerCommand('pseudoFolders.createChildFolder', async (item) => {
        if (!item || item.type !== 'pseudoFolder') {
            vscode.window.showErrorMessage('Please select a pseudo folder');
            return;
        }

        const name = await vscode.window.showInputBox({
            prompt: `Enter name for child folder inside "${item.label}"`,
            placeHolder: 'Child Folder',
            validateInput: (value) => {
                if (!value || !value.trim()) {
                    return 'Folder name cannot be empty';
                }
                if (value.length > 100) {
                    return 'Folder name too long (max 100 characters)';
                }
                if (/[<>:"/\\|?*]/.test(value)) {
                    return 'Folder name contains invalid characters';
                }
                return null;
            }
        });

        if (name && name.trim()) {
            try {
                const childId = Date.now().toString();
                const childFolder = {
                    id: childId,
                    name: name.trim(),
                    realFolders: [],
                    parentId: item.id,
                    childIds: []
                };
                await storage.addChildPseudoFolder(item.id, childFolder);
                provider.refresh();
            } catch (error) {
                console.error('Error creating child folder:', error);
                vscode.window.showErrorMessage('Failed to create child folder');
            }
        }
    });
}

export function deactivate() {}