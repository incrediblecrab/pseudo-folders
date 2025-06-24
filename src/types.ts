export interface PseudoFolder {
    id: string;
    name: string;
    realFolders: string[];
}

export interface PseudoFolderData {
    folders: PseudoFolder[];
}

export interface FileSystemItem {
    path: string;
    name: string;
    isDirectory: boolean;
    children?: FileSystemItem[];
}