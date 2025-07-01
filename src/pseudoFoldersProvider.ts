import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PseudoFolder, FileSystemItem } from './types';
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
            // Get root level folders (those without parentId)
            const allFolders = await this.storage.getPseudoFolders();
            const rootFolders = allFolders.filter(f => !f.parentId);
            
            return rootFolders.map(folder => {
                // Determine if this folder should be collapsible
                const hasChildren = (folder.childIds && folder.childIds.length > 0) || 
                                  (folder.realFolders && folder.realFolders.length > 0);
                const collapsibleState = hasChildren ? 
                    vscode.TreeItemCollapsibleState.Expanded : 
                    vscode.TreeItemCollapsibleState.None;
                
                return new PseudoFolderItem(
                    folder.id,
                    folder.name,
                    'pseudoFolder',
                    collapsibleState,
                    undefined,
                    folder.realFolders,
                    undefined,
                    folder.childIds
                );
            });
        } else if (element.type === 'pseudoFolder') {
            const items: PseudoFolderItem[] = [];
            const allFolders = await this.storage.getPseudoFolders();
            
            // First, add child pseudo folders
            if (element.childPseudoFolderIds && element.childPseudoFolderIds.length > 0) {
                for (const childId of element.childPseudoFolderIds) {
                    const childFolder = allFolders.find(f => f.id === childId);
                    if (childFolder) {
                        // Determine if this child folder should be collapsible
                        const hasChildren = (childFolder.childIds && childFolder.childIds.length > 0) || 
                                          (childFolder.realFolders && childFolder.realFolders.length > 0);
                        const collapsibleState = hasChildren ? 
                            vscode.TreeItemCollapsibleState.Expanded : 
                            vscode.TreeItemCollapsibleState.None;
                        
                        items.push(new PseudoFolderItem(
                            childFolder.id,
                            childFolder.name,
                            'pseudoFolder',
                            collapsibleState,
                            undefined,
                            childFolder.realFolders,
                            element.id,
                            childFolder.childIds
                        ));
                    }
                }
            }
            
            // Then, add real folders
            for (const folderPath of element.realFolders || []) {
                if (fs.existsSync(folderPath)) {
                    const stat = fs.statSync(folderPath);
                    const folderName = path.basename(folderPath);
                    
                    if (stat.isDirectory()) {
                        items.push(new PseudoFolderItem(
                            `${element.id}:${folderPath}`,
                            folderName,
                            'realFolder',
                            vscode.TreeItemCollapsibleState.Collapsed,
                            folderPath,
                            undefined,
                            element.id,
                            undefined
                        ));
                    } else {
                        items.push(new PseudoFolderItem(
                            `${element.id}:${folderPath}`,
                            folderName,
                            'file',
                            vscode.TreeItemCollapsibleState.None,
                            folderPath,
                            undefined,
                            element.id,
                            undefined
                        ));
                    }
                }
            }
            
            // Sort items: child pseudo folders first, then real folders, then files
            return items.sort((a, b) => {
                if (a.type === 'pseudoFolder' && b.type !== 'pseudoFolder') return -1;
                if (a.type !== 'pseudoFolder' && b.type === 'pseudoFolder') return 1;
                if (a.type === 'realFolder' && b.type === 'file') return -1;
                if (a.type === 'file' && b.type === 'realFolder') return 1;
                return a.label!.localeCompare(b.label!, undefined, { numeric: true, sensitivity: 'base' });
            });
        } else if (element.type === 'realFolder' && element.realPath) {
            return this.getFileSystemChildren(element.realPath, element.pseudoFolderId);
        }
        
        return [];
    }
    
    private async getFileSystemChildren(dirPath: string, pseudoFolderId?: string): Promise<PseudoFolderItem[]> {
        const items: PseudoFolderItem[] = [];
        
        try {
            if (!fs.existsSync(dirPath)) {
                return [];
            }
            
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            
            // Performance: Use withFileTypes to avoid extra stat calls
            for (const entry of entries) {
                // Skip hidden files and system files for performance
                if (entry.name.startsWith('.')) {
                    continue;
                }
                
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory()) {
                    items.push(new PseudoFolderItem(
                        `${pseudoFolderId || 'root'}:${fullPath}`,
                        entry.name,
                        'realFolder',
                        vscode.TreeItemCollapsibleState.Collapsed,
                        fullPath,
                        undefined,
                        pseudoFolderId,
                        undefined
                    ));
                } else if (entry.isFile()) {
                    items.push(new PseudoFolderItem(
                        `${pseudoFolderId || 'root'}:${fullPath}`,
                        entry.name,
                        'file',
                        vscode.TreeItemCollapsibleState.None,
                        fullPath,
                        undefined,
                        pseudoFolderId,
                        undefined
                    ));
                }
            }
        } catch (error) {
            console.error('Error reading directory:', dirPath, error);
            vscode.window.showErrorMessage(`Cannot read directory: ${path.basename(dirPath)}`);
            return [];
        }
        
        // Performance: Efficient sorting with pre-computed types
        return items.sort((a, b) => {
            if (a.type === 'realFolder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'realFolder') return 1;
            return a.label!.localeCompare(b.label!, undefined, { numeric: true, sensitivity: 'base' });
        });
    }
    
    async createPseudoFolder(name: string): Promise<void> {
        const id = Date.now().toString();
        const newFolder: PseudoFolder = {
            id,
            name,
            realFolders: [],
            parentId: undefined,
            childIds: []
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
            if (item.type === 'pseudoFolder' && target?.type === 'pseudoFolder' && item.id !== target.id) {
                // Check if we're not dropping a folder into its own descendant
                const folders = await this.storage.getPseudoFolders();
                if (!this.isDescendantOf(target.id, item.id, folders)) {
                    await this.storage.movePseudoFolder(item.id, target.id);
                } else {
                    vscode.window.showErrorMessage('Cannot move a folder into its own descendant');
                }
            } else if (item.type === 'pseudoFolder' && !target) {
                // Moving to root
                await this.storage.movePseudoFolder(item.id, undefined);
            } else if ((item.type === 'realFolder' || item.type === 'file') && target?.type === 'pseudoFolder' && item.realPath) {
                const sourcePseudoFolder = await this.findPseudoFolderContaining(item.realPath);
                if (sourcePseudoFolder) {
                    await this.storage.removeFolderFromPseudoFolder(sourcePseudoFolder.id, item.realPath);
                }
                await this.storage.addFolderToPseudoFolder(target.id, item.realPath);
            }
        }
        
        this.refresh();
    }
    
    private async findPseudoFolderContaining(folderPath: string): Promise<PseudoFolder | undefined> {
        const folders = await this.storage.getPseudoFolders();
        return folders.find(f => f.realFolders.includes(folderPath));
    }
    
    private async reorderPseudoFolders(draggedId: string, targetId: string): Promise<void> {
        const folders = await this.storage.getPseudoFolders();
        const draggedIndex = folders.findIndex(f => f.id === draggedId);
        const targetIndex = folders.findIndex(f => f.id === targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            const [draggedFolder] = folders.splice(draggedIndex, 1);
            folders.splice(targetIndex, 0, draggedFolder);
            await this.storage.savePseudoFolders(folders);
        }
    }
    
    private isDescendantOf(possibleDescendantId: string, ancestorId: string, folders: PseudoFolder[]): boolean {
        const ancestor = folders.find(f => f.id === ancestorId);
        if (!ancestor || !ancestor.childIds || ancestor.childIds.length === 0) {
            return false;
        }
        
        if (ancestor.childIds.includes(possibleDescendantId)) {
            return true;
        }
        
        // Check recursively
        for (const childId of ancestor.childIds) {
            if (this.isDescendantOf(possibleDescendantId, childId, folders)) {
                return true;
            }
        }
        
        return false;
    }
}

class PseudoFolderItem extends vscode.TreeItem {
    constructor(
        public readonly id: string,
        public readonly label: string,
        public readonly type: 'pseudoFolder' | 'realFolder' | 'file',
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly realPath?: string,
        public readonly realFolders?: string[],
        public readonly pseudoFolderId?: string,
        public readonly childPseudoFolderIds?: string[]
    ) {
        super(label, collapsibleState);
        
        this.contextValue = type;
        
        if (type === 'pseudoFolder') {
            // Use different icons to show hierarchy level
            if (pseudoFolderId) {
                // This is a nested pseudo folder
                this.iconPath = new vscode.ThemeIcon('folder-library');
                this.tooltip = `Nested Pseudo Folder: ${label}`;
            } else {
                // This is a root pseudo folder
                this.iconPath = new vscode.ThemeIcon('folder-opened');
                this.tooltip = `Pseudo Folder: ${label}`;
            }
            
            // Add indicators for children
            const totalChildren = (childPseudoFolderIds?.length || 0) + (realFolders?.length || 0);
            if (totalChildren > 0) {
                const childCount = childPseudoFolderIds?.length || 0;
                if (childCount > 0) {
                    this.description = `${childCount} nested, ${totalChildren - childCount} items`;
                } else {
                    this.description = `${totalChildren} items`;
                }
            }
        } else if (type === 'realFolder') {
            this.iconPath = new vscode.ThemeIcon('folder');
            this.tooltip = realPath;
            this.resourceUri = realPath ? vscode.Uri.file(realPath) : undefined;
        } else if (type === 'file') {
            this.iconPath = vscode.ThemeIcon.File;
            this.tooltip = realPath;
            this.resourceUri = realPath ? vscode.Uri.file(realPath) : undefined;
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.Uri.file(realPath!)]
            };
        }
    }
}