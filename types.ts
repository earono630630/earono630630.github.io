
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface User {
  id: string; // This acts as the System ID / Username
  name: string;
  password?: string; // Added password field
  role: UserRole;
  // List of extension paths the user is allowed to access (e.g., "1/2", "0")
  allowedPaths: string[]; 
  canUpload: boolean; // Permission to upload files
  canDelete: boolean; // Permission to delete files
  canDownload: boolean; // Permission to download files
}

export enum FileType {
  FOLDER = 'FOLDER',
  AUDIO = 'AUDIO',
  OTHER = 'OTHER'
}

export enum LogAction {
  DOWNLOAD = 'DOWNLOAD',
  UPLOAD = 'UPLOAD',
  DELETE = 'DELETE'
}

export interface SystemFile {
  id: string;
  name: string;
  path: string; // e.g., "1/2"
  type: FileType;
  size?: string;
  duration?: string; // For audio
  dateModified: string;
  url?: string; // Mock URL for download/play
  metadata?: string; // AI generated description or extra info
  childFoldersCount?: number; // Count of subfolders
  childFilesCount?: number;   // Count of files
  createdBy?: string; // User who uploaded the file
  fullDate?: string; // More detailed timestamp
  fileExtension?: string;
}

export interface Breadcrumb {
  name: string;
  path: string;
}

export interface SystemLogEntry {
  id: string;
  fileName: string;
  timestamp: string;
  userId: string;
  action: LogAction;
}
