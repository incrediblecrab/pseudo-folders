export interface PseudoFolder {
    id: string;
    name: string;
    realFolders: string[];
}

export interface PseudoFolderData {
    folders: PseudoFolder[];
}