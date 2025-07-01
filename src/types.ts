export interface PseudoFolder {
    id: string;
    name: string;
    realFolders: string[];
    parentId?: string;  // ID of parent pseudo folder (optional for backward compatibility)
    childIds?: string[]; // IDs of child pseudo folders (optional for backward compatibility)
}

export interface PseudoFolderData {
    version?: number; // Data format version for migration support
    folders: PseudoFolder[];
}

// Constants for safety limits
export const MAX_NESTING_DEPTH = 10;
export const CURRENT_DATA_VERSION = 2;

export interface FileSystemItem {
    path: string;
    name: string;
    isDirectory: boolean;
    children?: FileSystemItem[];
}