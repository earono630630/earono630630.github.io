
import { User, UserRole, SystemFile, FileType } from './types';

// Mock Users
export const MOCK_USERS: User[] = [
  {
    id: '1', 
    name: 'מנהל ראשי',
    password: '1',
    role: UserRole.ADMIN,
    allowedPaths: [], // Admin has access to everything
    canUpload: true,
    canDelete: true,
    canDownload: true
  },
  {
    id: '0509999999',
    name: 'יוסי כהן',
    password: '1234',
    role: UserRole.USER,
    allowedPaths: ['1', '1/1'], // Can only access News and General News
    canUpload: false,
    canDelete: false,
    canDownload: true
  },
  {
    id: '0508888888',
    name: 'דוד לוי',
    password: '1234',
    role: UserRole.USER,
    allowedPaths: ['2', '3'], // Can access Shiurim and Music
    canUpload: true,
    canDelete: false,
    canDownload: false
  }
];

// Mock File System
// In a real app, this would come from the Yemot API
export const MOCK_FILES: SystemFile[] = [
  // Root Level
  { id: 'f1', name: '1', metadata: 'חדשות והודעות', path: '1', type: FileType.FOLDER, dateModified: '2023-10-25' },
  { id: 'f2', name: '2', metadata: 'שיעורי תורה', path: '2', type: FileType.FOLDER, dateModified: '2023-10-24' },
  { id: 'f3', name: '3', metadata: 'מוזיקה וניגונים', path: '3', type: FileType.FOLDER, dateModified: '2023-10-20' },
  
  // Extension 1 (News)
  { id: 'f4', name: '1', metadata: 'מבזקים כלליים', path: '1/1', type: FileType.FOLDER, dateModified: '2023-10-25' },
  { id: 'f5', name: '2', metadata: 'הודעות הקהילה', path: '1/2', type: FileType.FOLDER, dateModified: '2023-10-23' },
  { id: 'f101', name: 'פתיח ראשי.wav', path: '1/M0000.wav', type: FileType.AUDIO, size: '2.5MB', duration: '00:45', dateModified: '2023-10-25', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },

  // Extension 1/1 (General News)
  { id: 'f102', name: 'עדכון בוקר.wav', path: '1/1/001.wav', type: FileType.AUDIO, size: '5.1MB', duration: '03:12', dateModified: '2023-10-26', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  
  // Extension 2 (Torah)
  { id: 'f6', name: '1', metadata: 'דף היומי', path: '2/1', type: FileType.FOLDER, dateModified: '2023-10-26' },
  { id: 'f7', name: '2', metadata: 'פרשת שבוע', path: '2/2', type: FileType.FOLDER, dateModified: '2023-10-26' },
  { id: 'f201', name: 'הקדמה לשיעורים.wav', path: '2/M0000.wav', type: FileType.AUDIO, size: '1.2MB', duration: '01:00', dateModified: '2023-09-01', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },

  // Extension 2/1 (Daf Yomi)
  { id: 'f202', name: 'מסכת קידושין דף ב.wav', path: '2/1/002.wav', type: FileType.AUDIO, size: '45MB', duration: '45:00', dateModified: '2023-10-26', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },

   // Extension 3 (Music)
  { id: 'f301', name: 'ניגון שמחה.wav', path: '3/001.wav', type: FileType.AUDIO, size: '4.5MB', duration: '03:30', dateModified: '2023-10-15', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
];
