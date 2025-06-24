import * as vscode from 'vscode';
import * as path from 'path';
import { PseudoFolder } from './types';
import { PseudoFolderStorage } from './storage';

export class PseudoFoldersProvider implements vscode.TreeDataProvider<PseudoFolderItem>, vscode.TreeDragAndDropController<PseudoFolderItem> {
    dropMimeTypes = ['application/vnd.code.tree.pseudofolders', 'text/uri-list'];
    dragMimeTypes = ['text/uri-list'];
    
    private _onDidChangeTreeData: vscode.EventEmitter<PseudoFolderItem | undefined | null | void> = new vscode.EventEmitter<PseudoFolderItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PseudoFolderItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    constructor(private storage: PseudoFolderStorage) {}
    
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    getTreeItem(element: PseudoFolderItem): vscode.TreeItem {
        return element;
    }
    
    async getChildren(element?: PseudoFolderItem): Promise<PseudoFolderItem[]> {
        if (!element) {
            const folders = await this.storage.getPseudoFolders();
            return folders.map(folder => new PseudoFolderItem(
                folder.id,
                folder.name,
                'pseudoFolder',
                vscode.TreeItemCollapsibleState.Expanded,
                folder.realFolders
            ));
        } else if (element.type === 'pseudoFolder') {
            return element.realFolders.map(folderPath => {
                const folderName = path.basename(folderPath);
                return new PseudoFolderItem(
                    folderPath,
                    folderName,
                    'realFolder',
                    vscode.TreeItemCollapsibleState.None,
                    [],
                    folderPath
                );
            });
        }
        return [];
    }
    
    async createPseudoFolder(name: string): Promise<void> {
        const id = Date.now().toString();
        const newFolder: PseudoFolder = {
            id,
            name,
            realFolders: []
        };
        await this.storage.addPseudoFolder(newFolder);
        this.refresh();
    }
    
    async deletePseudoFolder(id: string): Promise<void> {
        await this.storage.deletePseudoFolder(id);
        this.refresh();
    }
    
    async renamePseudoFolder(id: string, newName: string): Promise<void> {
        await this.storage.updatePseudoFolder(id, { name: newName });
        this.refresh();
    }
    
    async handleDrag(source: readonly PseudoFolderItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
        dataTransfer.set('application/vnd.code.tree.pseudofolders', new vscode.DataTransferItem(source));
    }
    
    async handleDrop(target: PseudoFolderItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
        const transferItem = dataTransfer.get('application/vnd.code.tree.pseudofolders');
        if (!transferItem) {
            const uriList = await dataTransfer.get('text/uri-list')?.asString();
            if (uriList && target?.type === 'pseudoFolder') {
                const uris = uriList.split('\r\n').filter(uri => uri);
                for (const uriString of uris) {
                    const uri = vscode.Uri.parse(uriString);
                    if (uri.scheme === 'file') {
                        await this.storage.addFolderToPseudoFolder(target.id, uri.fsPath);
                    }
                }
                this.refresh();
            }
            return;
        }
        
        const draggedItems = transferItem.value as PseudoFolderItem[];
        
        for (const item of draggedItems) {
            if (item.type === 'realFolder' && target?.type === 'pseudoFolder') {
                const sourcePseudoFolder = await this.findPseudoFolderContaining(item.realPath!);
                if (sourcePseudoFolder) {
                    await this.storage.removeFolderFromPseudoFolder(sourcePseudoFolder.id, item.realPath!);
                }
                await this.storage.addFolderToPseudoFolder(target.id, item.realPath!);
            }
        }
        
        this.refresh();
    }
    
    private async findPseudoFolderContaining(folderPath: string): Promise<PseudoFolder | undefined> {
        const folders = await this.storage.getPseudoFolders();
        return folders.find(f => f.realFolders.includes(folderPath));
    }
}

class PseudoFolderItem extends vscode.TreeItem {
    constructor(
        public readonly id: string,
        public readonly label: string,
        public readonly type: 'pseudoFolder' | 'realFolder',
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly realFolders: string[] = [],
        public readonly realPath?: string
    ) {
        super(label, collapsibleState);
        
        this.contextValue = type;
        
        if (type === 'pseudoFolder') {
            this.iconPath = new vscode.ThemeIcon('folder');
            this.tooltip = `Pseudo Folder: ${label}`;
        } else {
            this.iconPath = new vscode.ThemeIcon('folder');
            this.tooltip = realPath;
            this.resourceUri = vscode.Uri.file(realPath!);
        }
    }
}