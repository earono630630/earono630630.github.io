
import { MOCK_FILES, MOCK_USERS } from '../constants';
import { UserRole, SystemFile, User, FileType } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class YemotService {
  private token: string | null = null;
  private apiToken: string | null = null; 
  private storageKey = 'yemot_custom_descriptions';
  private deletedFilesKey = 'yemot_deleted_files'; 
  private extraMockFiles: SystemFile[] = []; 
  private deletedMockPaths: Set<string> = new Set(); 
  private currentUser: User | null = null;

  constructor() {
    this.loadDeletedFiles();
  }

  setApiToken(token: string) {
    this.apiToken = token;
  }

  private loadDeletedFiles() {
    try {
      const stored = localStorage.getItem(this.deletedFilesKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.deletedMockPaths = new Set(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load deleted files", e);
    }
  }

  private saveDeletedFiles() {
    try {
      localStorage.setItem(this.deletedFilesKey, JSON.stringify(Array.from(this.deletedMockPaths)));
    } catch (e) {
      console.error("Failed to save deleted files", e);
    }
  }

  private getCustomDescriptions(): Record<string, string> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  }

  saveCustomDescription(path: string, description: string) {
    const current = this.getCustomDescriptions();
    if (!description.trim()) {
        delete current[path]; 
    } else {
        current[path] = description;
    }
    localStorage.setItem(this.storageKey, JSON.stringify(current));
  }

  async login(id: string, password: string, usersList: User[]): Promise<User> {
    await delay(600); 
    const user = usersList.find(u => u.id === id && u.password === password);
    if (user) {
      this.token = `session-${user.id}`;
      this.currentUser = user;
      return user;
    }
    throw new Error('שם משתמש או סיסמה שגויים');
  }

  restoreSession(user: User) {
    this.token = `session-${user.id}`;
    this.currentUser = user;
  }

  async logout(): Promise<void> {
    this.token = null;
    this.currentUser = null;
  }

  async validateToken(): Promise<boolean> {
    if (!this.apiToken) return false;
    try {
        const url = `https://www.call2all.co.il/ym/api/GetIVR2Dir?token=${this.apiToken}&path=/`;
        const response = await fetch(url);
        if (!response.ok) return false;
        const data = await response.json();
        return data.responseStatus === 'OK';
    } catch (e) {
        return false;
    }
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.token) throw new Error('Unauthorized');
    this.deletedMockPaths.add(path);
    this.saveDeletedFiles();
    if (this.apiToken) {
        try {
            const standardizedPath = path.startsWith('/') ? path : `/${path}`;
            const url = `https://www.call2all.co.il/ym/api/FileAction?token=${this.apiToken}&action=delete&what=ivr2:${standardizedPath}`;
            const response = await fetch(url);
            if (response.ok) {
                 const data = await response.json();
                 if (data.responseStatus !== 'OK') {
                     console.warn("Server-side deletion failed:", data.message);
                 }
            }
        } catch(e) {
            console.error("API delete failed:", e);
        }
    }
    await delay(300);
  }

  async uploadFile(currentPath: string, file: File, existingFiles: SystemFile[]): Promise<void> {
    if (!this.token) throw new Error('Unauthorized');
    const extensionParts = file.name.split('.');
    const extension = extensionParts.length > 1 ? extensionParts.pop() : '';
    const dotExtension = extension ? `.${extension}` : '';
    const numbers = existingFiles
        .filter(f => f.type !== FileType.FOLDER)
        .map(f => {
             const pathParts = f.path.split('/');
             const fileName = pathParts[pathParts.length - 1];
             const match = fileName.match(/^(\d+)\./);
             return match ? parseInt(match[1], 10) : -1;
        })
        .filter(n => n >= 0);
    const max = numbers.length > 0 ? Math.max(...numbers) : -1;
    const nextNum = max + 1;
    const newFileName = `${String(nextNum).padStart(3, '0')}${dotExtension}`;
    const cleanPath = currentPath === '' ? '' : currentPath;
    const targetPath = cleanPath ? `${cleanPath}/${newFileName}` : newFileName;

    if (this.apiToken) {
        try {
            const formData = new FormData();
            formData.append('file', file, newFileName);
            const standardizedPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
            const url = `https://www.call2all.co.il/ym/api/UploadFile?token=${this.apiToken}&path=ivr2:${standardizedPath}&convertAudio=1`;
            const response = await fetch(url, { method: 'POST', body: formData });
            if (response.ok) {
                const data = await response.json();
                if (data.responseStatus === 'OK') return;
            }
        } catch (e) {
             console.warn("API upload failed");
        }
    }
    await delay(1000);
    const newFile: SystemFile = {
        id: `mock-upload-${Date.now()}`,
        name: newFileName, 
        path: targetPath,
        type: file.type.startsWith('audio/') ? FileType.AUDIO : FileType.OTHER,
        size: this.formatBytes(file.size),
        dateModified: new Date().toLocaleDateString('he-IL'),
        fullDate: new Date().toLocaleString('he-IL'),
        url: URL.createObjectURL(file),
        createdBy: this.currentUser?.name || 'מערכת',
        fileExtension: extension
    };
    this.extraMockFiles.push(newFile);
  }

  async getFiles(path: string, user: User): Promise<SystemFile[]> {
    if (!this.token) throw new Error('Unauthorized');
    let rawFiles: SystemFile[] = [];
    let isUsingMockData = false;
    if (this.apiToken) {
      try {
        rawFiles = await this.fetchFromYemotAPI(path);
      } catch (error) {
        rawFiles = this.getMockFiles(path);
        isUsingMockData = true;
      }
    } else {
      await delay(400);
      rawFiles = this.getMockFiles(path);
      isUsingMockData = true;
    }
    rawFiles = rawFiles.filter(f => !this.deletedMockPaths.has(f.path));
    if (isUsingMockData) {
        const allMockItems = [...MOCK_FILES, ...this.extraMockFiles].filter(f => !this.deletedMockPaths.has(f.path));
        rawFiles = rawFiles.map(item => {
          if (item.type === FileType.FOLDER) {
            const children = allMockItems.filter(child => {
              if (!child.path.startsWith(item.path + '/')) return false;
              const remaining = child.path.substring(item.path.length + 1);
              return !remaining.includes('/'); 
            });
            return {
              ...item,
              childFoldersCount: children.filter(c => c.type === FileType.FOLDER).length,
              childFilesCount: children.filter(c => c.type !== FileType.FOLDER).length
            };
          }
          return {
              ...item,
              createdBy: item.createdBy || 'מערכת ימות המשיח',
              fullDate: item.fullDate || `${item.dateModified} 12:00:00`
          };
        });
    }
    const customDescriptions = this.getCustomDescriptions();
    rawFiles = rawFiles.map(file => {
      if (customDescriptions[file.path]) return { ...file, metadata: customDescriptions[file.path] };
      return file;
    });
    if (user.role !== UserRole.ADMIN) {
        return rawFiles.filter(f => {
            return user.allowedPaths.some(allowed => {
                if (f.path === allowed) return true;
                if (f.path.startsWith(allowed + '/')) return true;
                if (f.type === FileType.FOLDER && allowed.startsWith(f.path + '/')) return true;
                return false;
            });
        });
    }
    return rawFiles;
  }

  async searchFiles(query: string, user: User): Promise<SystemFile[]> {
    if (!this.token) throw new Error('Unauthorized');
    // In a real API, this would be a single server-side search call.
    // Here we simulate by searching through all mock files + descriptions.
    await delay(800);
    const q = query.toLowerCase();
    const allFiles = [...MOCK_FILES, ...this.extraMockFiles].filter(f => !this.deletedMockPaths.has(f.path));
    const customDescriptions = this.getCustomDescriptions();
    
    let filtered = allFiles.filter(f => {
      const nameMatch = f.name.toLowerCase().includes(q);
      const metadataMatch = (f.metadata || '').toLowerCase().includes(q);
      const customMatch = (customDescriptions[f.path] || '').toLowerCase().includes(q);
      return nameMatch || metadataMatch || customMatch;
    });

    if (user.role !== UserRole.ADMIN) {
      filtered = filtered.filter(f => {
        return user.allowedPaths.some(allowed => {
          return f.path === allowed || f.path.startsWith(allowed + '/');
        });
      });
    }

    return filtered.map(f => ({
      ...f,
      metadata: customDescriptions[f.path] || f.metadata
    }));
  }

  private getMockFiles(path: string): SystemFile[] {
    const allFiles = [...MOCK_FILES, ...this.extraMockFiles];
    if (path === '') return allFiles.filter(f => !f.path.includes('/'));
    return allFiles.filter(f => {
        if (!f.path.startsWith(path + '/')) return false;
        const remaining = f.path.substring(path.length + 1);
        return !remaining.includes('/');
    });
  }

  private encodePath(path: string): string {
    return path.split('/').map(part => encodeURIComponent(part)).join('/');
  }

  private async fetchFromYemotAPI(path: string): Promise<SystemFile[]> {
    const standardizedPath = path.startsWith('/') ? path : `/${path}`;
    const encodedPath = this.encodePath(standardizedPath);
    const url = `https://www.call2all.co.il/ym/api/GetIVR2Dir?token=${this.apiToken}&path=${encodedPath}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error`);
    const data = await response.json();
    if (data.responseStatus !== 'OK') throw new Error(data.message || 'API Error');
    const mappedFiles: SystemFile[] = [];
    if (data.dirs) {
      data.dirs.forEach((dir: any) => {
        mappedFiles.push({
          id: `dir-${dir.name}`,
          name: dir.name,
          metadata: dir.what,
          path: path ? `${path}/${dir.name}` : dir.name,
          type: FileType.FOLDER,
          dateModified: '---',
          createdBy: 'ימות המשיח'
        });
      });
    }
    if (data.files) {
      data.files.forEach((file: any) => {
        const extension = file.name.split('.').pop();
        const isAudio = ['wav', 'mp3', 'wma'].includes(extension?.toLowerCase() || '');
        const fullFilePath = path ? `${path}/${file.name}` : file.name;
        const standardizedFullFilePath = fullFilePath.startsWith('/') ? fullFilePath : `/${fullFilePath}`;
        const encodedFullPath = this.encodePath(standardizedFullFilePath);
        const downloadUrl = `https://www.call2all.co.il/ym/api/DownloadFile?token=${this.apiToken}&path=ivr2:${encodedFullPath}`;
        const dateObj = file.time ? new Date(file.time * 1000) : null;
        mappedFiles.push({
          id: `file-${file.name}-${file.time || Date.now()}`,
          name: file.what || file.name,
          path: fullFilePath,
          type: isAudio ? FileType.AUDIO : FileType.OTHER,
          size: this.formatBytes(file.size),
          dateModified: dateObj ? dateObj.toLocaleDateString('he-IL') : '---',
          fullDate: dateObj ? dateObj.toLocaleString('he-IL') : '---',
          url: downloadUrl,
          createdBy: 'מערכת ימות המשיח',
          fileExtension: extension
        });
      });
    }
    return mappedFiles;
  }

  private formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }
}

export const yemotService = new YemotService();
