import * as vscode from 'vscode';
import { PseudoFolder, PseudoFolderData } from './types';

export class PseudoFolderStorage {
    private static readonly STORAGE_KEY = 'pseudoFolders';
    
    constructor(private context: vscode.ExtensionContext) {}
    
    async getPseudoFolders(): Promise<PseudoFolder[]> {
        const data = this.context.workspaceState.get<PseudoFolderData>(
            PseudoFolderStorage.STORAGE_KEY,
            { folders: [] }
        );
        return data.folders;
    }
    
    async savePseudoFolders(folders: PseudoFolder[]): Promise<void> {
        const data: PseudoFolderData = { folders };
        await this.context.workspaceState.update(PseudoFolderStorage.STORAGE_KEY, data);
    }
    
    async addPseudoFolder(folder: PseudoFolder): Promise<void> {
        const folders = await this.getPseudoFolders();
        folders.push(folder);
        await this.savePseudoFolders(folders);
    }
    
    async updatePseudoFolder(id: string, updates: Partial<PseudoFolder>): Promise<void> {
        const folders = await this.getPseudoFolders();
        const index = folders.findIndex(f => f.id === id);
        
        if (index !== -1) {
            folders[index] = { ...folders[index], ...updates };
            await this.savePseudoFolders(folders);
        }
    }
    
    async deletePseudoFolder(id: string): Promise<void> {
        const folders = await this.getPseudoFolders();
        const filtered = folders.filter(f => f.id !== id);
        await this.savePseudoFolders(filtered);
    }
    
    async addFolderToPseudoFolder(pseudoFolderId: string, folderPath: string): Promise<void> {
        const folders = await this.getPseudoFolders();
        const pseudoFolder = folders.find(f => f.id === pseudoFolderId);
        
        if (pseudoFolder && !pseudoFolder.realFolders.includes(folderPath)) {
            pseudoFolder.realFolders.push(folderPath);
            await this.savePseudoFolders(folders);
        }
    }
    
    async removeFolderFromPseudoFolder(pseudoFolderId: string, folderPath: string): Promise<void> {
        const folders = await this.getPseudoFolders();
        const pseudoFolder = folders.find(f => f.id === pseudoFolderId);
        
        if (pseudoFolder) {
            pseudoFolder.realFolders = pseudoFolder.realFolders.filter(f => f !== folderPath);
            await this.savePseudoFolders(folders);
        }
    }
}