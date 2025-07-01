import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PseudoFolder, PseudoFolderData, CURRENT_DATA_VERSION, MAX_NESTING_DEPTH } from './types';

export class PseudoFolderStorage {
    private static readonly STORAGE_FILE = '.pseudo-folders.json';
    private static readonly BACKUP_FILE = '.pseudo-folders.backup.json';
    private static readonly MAX_BACKUPS = 3;
    
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
            
            let data: PseudoFolderData = JSON.parse(content);
            
            // Migrate data if needed
            data = await this.migrateDataIfNeeded(data);
            
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
        
        // Validate before saving
        if (!this.validateFolderStructure(folders)) {
            console.error('Invalid folder structure detected, aborting save');
            return;
        }
        
        const data: PseudoFolderData = { 
            version: CURRENT_DATA_VERSION,
            folders 
        };
        
        try {
            // Create backup before saving
            await this.createBackup(filePath);
            
            // Atomic write: write to temp file then rename
            const tempPath = filePath + '.tmp';
            fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
            
            // Validate the written file
            const writtenContent = fs.readFileSync(tempPath, 'utf-8');
            JSON.parse(writtenContent); // This will throw if invalid JSON
            
            // Rename temp file to actual file (atomic operation)
            fs.renameSync(tempPath, filePath);
        } catch (error) {
            console.error('Error saving pseudo folders:', error);
            // Try to restore from backup
            await this.restoreFromBackup(filePath);
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
        const folderToDelete = folders.find(f => f.id === id);
        
        if (!folderToDelete) {
            return;
        }
        
        // If the folder has children, move them to root level
        if (folderToDelete.childIds && folderToDelete.childIds.length > 0) {
            for (const childId of folderToDelete.childIds) {
                const childFolder = folders.find(f => f.id === childId);
                if (childFolder) {
                    childFolder.parentId = undefined;
                }
            }
        }
        
        // If the folder has a parent, remove it from parent's children
        if (folderToDelete.parentId) {
            const parentFolder = folders.find(f => f.id === folderToDelete.parentId);
            if (parentFolder && parentFolder.childIds) {
                parentFolder.childIds = parentFolder.childIds.filter(cid => cid !== id);
            }
        }
        
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
    
    // Migration logic for backward compatibility
    private async migrateDataIfNeeded(data: any): Promise<PseudoFolderData> {
        // If no version, it's old format (version 1)
        if (!data.version || data.version < CURRENT_DATA_VERSION) {
            console.log('Migrating pseudo folders data to version', CURRENT_DATA_VERSION);
            
            // Ensure all folders have the new fields
            if (Array.isArray(data.folders)) {
                data.folders = data.folders.map((folder: any) => ({
                    ...folder,
                    parentId: folder.parentId || undefined,
                    childIds: folder.childIds || []
                }));
            }
            
            data.version = CURRENT_DATA_VERSION;
        }
        
        return data;
    }
    
    // Validation functions
    private validateFolderStructure(folders: PseudoFolder[]): boolean {
        // Check for circular references
        for (const folder of folders) {
            if (folder.parentId && this.hasCircularReference(folder.id, folder.parentId, folders)) {
                console.error(`Circular reference detected for folder ${folder.name}`);
                return false;
            }
            
            // Check nesting depth
            if (this.getNestingDepth(folder.id, folders) > MAX_NESTING_DEPTH) {
                console.error(`Folder ${folder.name} exceeds maximum nesting depth`);
                return false;
            }
        }
        
        // Validate parent-child relationships
        for (const folder of folders) {
            if (folder.childIds) {
                for (const childId of folder.childIds) {
                    const child = folders.find(f => f.id === childId);
                    if (!child) {
                        console.error(`Child ${childId} not found for folder ${folder.name}`);
                        return false;
                    }
                    if (child.parentId !== folder.id) {
                        console.error(`Parent-child mismatch for ${folder.name} and ${child.name}`);
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
    
    private hasCircularReference(folderId: string, targetId: string, folders: PseudoFolder[]): boolean {
        if (folderId === targetId) {
            return true;
        }
        
        const target = folders.find(f => f.id === targetId);
        if (!target || !target.parentId) {
            return false;
        }
        
        return this.hasCircularReference(folderId, target.parentId, folders);
    }
    
    private getNestingDepth(folderId: string, folders: PseudoFolder[]): number {
        const folder = folders.find(f => f.id === folderId);
        if (!folder || !folder.parentId) {
            return 0;
        }
        
        return 1 + this.getNestingDepth(folder.parentId, folders);
    }
    
    // Backup and recovery functions
    private async createBackup(filePath: string): Promise<void> {
        if (!fs.existsSync(filePath)) {
            return;
        }
        
        try {
            const backupDir = path.dirname(filePath);
            const backupBase = path.join(backupDir, '.pseudo-folders.backup');
            
            // Rotate backups
            for (let i = PseudoFolderStorage.MAX_BACKUPS - 1; i > 0; i--) {
                const oldBackup = `${backupBase}.${i}.json`;
                const newBackup = `${backupBase}.${i + 1}.json`;
                if (fs.existsSync(oldBackup)) {
                    fs.renameSync(oldBackup, newBackup);
                }
            }
            
            // Create new backup
            fs.copyFileSync(filePath, `${backupBase}.1.json`);
        } catch (error) {
            console.error('Error creating backup:', error);
        }
    }
    
    private async restoreFromBackup(filePath: string): Promise<void> {
        const backupDir = path.dirname(filePath);
        const backupBase = path.join(backupDir, '.pseudo-folders.backup');
        
        // Try to restore from most recent backup
        for (let i = 1; i <= PseudoFolderStorage.MAX_BACKUPS; i++) {
            const backupPath = `${backupBase}.${i}.json`;
            if (fs.existsSync(backupPath)) {
                try {
                    fs.copyFileSync(backupPath, filePath);
                    console.log(`Restored from backup ${i}`);
                    return;
                } catch (error) {
                    console.error(`Failed to restore from backup ${i}:`, error);
                }
            }
        }
        
        console.error('No valid backup found');
    }
    
    // Helper function to add a pseudo folder as a child of another
    async addChildPseudoFolder(parentId: string, childFolder: PseudoFolder): Promise<void> {
        const folders = await this.getPseudoFolders();
        const parent = folders.find(f => f.id === parentId);
        
        if (!parent) {
            console.error('Parent folder not found');
            return;
        }
        
        // Check if this would create a circular reference
        if (this.hasCircularReference(parentId, childFolder.id, folders)) {
            console.error('Cannot add child: would create circular reference');
            return;
        }
        
        // Check nesting depth
        const parentDepth = this.getNestingDepth(parentId, folders);
        if (parentDepth >= MAX_NESTING_DEPTH - 1) {
            console.error('Cannot add child: would exceed maximum nesting depth');
            return;
        }
        
        // Update parent-child relationships
        childFolder.parentId = parentId;
        if (!parent.childIds) {
            parent.childIds = [];
        }
        if (!parent.childIds.includes(childFolder.id)) {
            parent.childIds.push(childFolder.id);
        }
        
        // Add the child folder if it's new
        if (!folders.find(f => f.id === childFolder.id)) {
            folders.push(childFolder);
        }
        
        await this.savePseudoFolders(folders);
    }
    
    // Move a pseudo folder to a new parent (or to root)
    async movePseudoFolder(folderId: string, newParentId?: string): Promise<void> {
        const folders = await this.getPseudoFolders();
        const folder = folders.find(f => f.id === folderId);
        
        if (!folder) {
            return;
        }
        
        // Check for circular reference
        if (newParentId && this.hasCircularReference(newParentId, folderId, folders)) {
            console.error('Cannot move folder: would create circular reference');
            return;
        }
        
        // Remove from old parent
        if (folder.parentId) {
            const oldParent = folders.find(f => f.id === folder.parentId);
            if (oldParent && oldParent.childIds) {
                oldParent.childIds = oldParent.childIds.filter(id => id !== folderId);
            }
        }
        
        // Add to new parent
        folder.parentId = newParentId;
        if (newParentId) {
            const newParent = folders.find(f => f.id === newParentId);
            if (newParent) {
                if (!newParent.childIds) {
                    newParent.childIds = [];
                }
                if (!newParent.childIds.includes(folderId)) {
                    newParent.childIds.push(folderId);
                }
            }
        }
        
        await this.savePseudoFolders(folders);
    }
}