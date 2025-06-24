import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PseudoFolder, PseudoFolderData } from './types';

export class PseudoFolderStorage {
    private static readonly STORAGE_FILE = '.pseudo-folders.json';
    
    constructor(private context: vscode.ExtensionContext) {}
    
    private getStorageFilePath(): string | undefined {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return undefined;
        }
        return path.join(workspaceFolder.uri.fsPath, PseudoFolderStorage.STORAGE_FILE);
    }
    
    async getPseudoFolders(): Promise<PseudoFolder[]> {
        const filePath = this.getStorageFilePath();
        if (!filePath || !fs.existsSync(filePath)) {
            return [];
        }
        
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            if (!content.trim()) {
                return [];
            }
            
            const data: PseudoFolderData = JSON.parse(content);
            
            // Validate data structure
            if (!data || typeof data !== 'object' || !Array.isArray(data.folders)) {
                console.warn('Invalid pseudo folders data structure, resetting');
                return [];
            }
            
            // Validate and clean up folder entries
            const validFolders = data.folders.filter(folder => {
                if (!folder || typeof folder !== 'object') return false;
                if (!folder.id || !folder.name || !Array.isArray(folder.realFolders)) return false;
                
                // Filter out non-existent paths for safety
                folder.realFolders = folder.realFolders.filter(p => {
                    try {
                        return typeof p === 'string' && fs.existsSync(p);
                    } catch {
                        return false;
                    }
                });
                
                return true;
            });
            
            return validFolders;
        } catch (error) {
            console.error('Error reading pseudo folders:', error);
            return [];
        }
    }
    
    async savePseudoFolders(folders: PseudoFolder[]): Promise<void> {
        const filePath = this.getStorageFilePath();
        if (!filePath) {
            return;
        }
        
        const data: PseudoFolderData = { folders };
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            console.error('Error saving pseudo folders:', error);
        }
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
        // Input validation
        if (!pseudoFolderId || !folderPath || typeof pseudoFolderId !== 'string' || typeof folderPath !== 'string') {
            console.warn('Invalid input for addFolderToPseudoFolder');
            return;
        }
        
        // Validate path exists
        if (!fs.existsSync(folderPath)) {
            console.warn('Path does not exist:', folderPath);
            return;
        }
        
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