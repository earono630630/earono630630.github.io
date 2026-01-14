
import React, { useState, useEffect, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import { User, UserRole, SystemFile, FileType, Breadcrumb, SystemLogEntry, LogAction } from './types';
import { MOCK_USERS, MOCK_FILES } from './constants';
import { Icons } from './components/Icons';
import PermissionsModal from './components/PermissionsModal';
import AIChat from './components/AIChat';
import LoginScreen from './components/LoginScreen';
import SystemLogsView from './components/DownloadLogsView';
import { yemotService } from './services/yemotService';

type SortOption = 'name-asc' | 'name-desc' | 'date' | 'size' | 'default';
type ViewType = 'files' | 'logs';

const FileSkeleton = () => (
  <div className="relative flex flex-col p-5 bg-white border border-gray-100 rounded-2xl shadow-sm animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="p-3 rounded-2xl bg-gray-100 w-12 h-12"></div>
      <div className="flex gap-1">
        <div className="w-8 h-8 rounded-full bg-gray-50"></div>
        <div className="w-8 h-8 rounded-full bg-gray-50"></div>
      </div>
    </div>
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-3 bg-gray-100 rounded w-1/2 mb-4"></div>
    <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between">
      <div className="h-3 bg-gray-100 rounded w-1/3"></div>
      <div className="h-3 bg-gray-100 rounded w-1/4"></div>
    </div>
  </div>
);

const App: React.FC = () => {
  // --- Initialization Logic ---
  const getInitialUsers = (): User[] => {
    const saved = localStorage.getItem('yemot_users');
    return saved ? JSON.parse(saved) : MOCK_USERS;
  };

  const getInitialToken = (): string => {
    return localStorage.getItem('yemot_token') || '';
  };

  const getInitialSystemLog = (): SystemLogEntry[] => {
    const saved = localStorage.getItem('yemot_system_log');
    return saved ? JSON.parse(saved) : [];
  };

  // --- State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [apiToken, setApiToken] = useState<string>(getInitialToken);
  const [systemLog, setSystemLog] = useState<SystemLogEntry[]>(getInitialSystemLog);
  const [activeView, setActiveView] = useState<ViewType>('files');
  
  // Data State
  const [currentPath, setCurrentPath] = useState<string>(''); 
  const [currentFiles, setCurrentFiles] = useState<SystemFile[]>([]);
  const [allFolders, setAllFolders] = useState<SystemFile[]>([]);
  const [isFilesLoading, setIsFilesLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingMode, setIsSearchingMode] = useState(false);
  const [searchResults, setSearchResults] = useState<SystemFile[]>([]);

  // Default sorting
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  
  // Audio Player State
  const [playingFile, setPlayingFile] = useState<SystemFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // Connection Status State
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'warning' | 'connected'>('disconnected');

  // UI State
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [fileDetails, setFileDetails] = useState<SystemFile | null>(null);
  const [fileToDelete, setFileToDelete] = useState<SystemFile | null>(null);
  
  const [allUsers, setAllUsers] = useState<User[]>(getInitialUsers);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Computed Permissions ---
  const canUserUpload = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.role === UserRole.ADMIN || currentUser.canUpload;
  }, [currentUser]);

  const canUserDelete = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.role === UserRole.ADMIN || currentUser.canDelete;
  }, [currentUser]);

  const canUserDownload = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.role === UserRole.ADMIN || currentUser.canDownload;
  }, [currentUser]);

  // --- Sorting ---
  const parseSizeToBytes = (sizeStr?: string): number => {
    if (!sizeStr) return 0;
    const units: Record<string, number> = { 'Bytes': 1, 'KB': 1024, 'MB': 1024 * 1024, 'GB': 1024 * 1024 * 1024 };
    const match = sizeStr.match(/^([\d.]+)\s*(\w+)$/);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2];
    return value * (units[unit] || 0);
  };

  const activeFilesList = isSearchingMode ? searchResults : currentFiles;

  const sortedFiles = useMemo(() => {
    const folders = activeFilesList.filter(f => f.type === FileType.FOLDER);
    const files = activeFilesList.filter(f => f.type !== FileType.FOLDER);

    const folderSortFn = (a: SystemFile, b: SystemFile) => {
      switch (sortBy) {
        case 'date': return new Date(b.dateModified).getTime() - new Date(a.dateModified).getTime();
        case 'size': return parseSizeToBytes(b.size) - parseSizeToBytes(a.size);
        case 'name-desc': return b.name.localeCompare(a.name, 'he', { numeric: true });
        default: return a.name.localeCompare(b.name, 'he', { numeric: true });
      }
    };

    const fileSortFn = (a: SystemFile, b: SystemFile) => {
      switch (sortBy) {
        case 'date': return new Date(b.dateModified).getTime() - new Date(a.dateModified).getTime();
        case 'size': return parseSizeToBytes(b.size) - parseSizeToBytes(a.size);
        case 'name-asc': return a.name.localeCompare(a.name, 'he', { numeric: true });
        default: return b.name.localeCompare(a.name, 'he', { numeric: true });
      }
    };

    return [...folders.sort(folderSortFn), ...files.sort(fileSortFn)];
  }, [activeFilesList, sortBy]);

  // --- Effects ---
  useEffect(() => {
    const storedToken = localStorage.getItem('yemot_token');
    if (storedToken) {
        yemotService.setApiToken(storedToken);
        setApiToken(storedToken);
    }
  }, []);

  useEffect(() => {
    const storedUserId = localStorage.getItem('yemot_active_user_id');
    if (storedUserId) {
        const user = allUsers.find(u => u.id === storedUserId);
        if (user) {
            yemotService.restoreSession(user);
            setCurrentUser(user);
        }
    }
  }, [allUsers]);

  useEffect(() => {
    const checkStatus = async () => {
      if (!apiToken) {
        setConnectionStatus('disconnected');
        return;
      }
      yemotService.setApiToken(apiToken);
      setConnectionStatus('warning');
      const isValid = await yemotService.validateToken();
      setConnectionStatus(isValid ? 'connected' : 'warning');
    };
    checkStatus();
  }, [apiToken]);
  
  useEffect(() => {
    if (!isSearchingMode && activeView === 'files') {
      loadFiles();
    }
    loadAllFolderStructure();
    setSelectedPaths(new Set()); 
  }, [currentPath, currentUser, apiToken, isSearchingMode, activeView]); 

  useEffect(() => {
    localStorage.setItem('yemot_system_log', JSON.stringify(systemLog));
  }, [systemLog]);

  const loadFiles = async () => {
    if (!currentUser) return;
    setIsFilesLoading(true);
    try {
      const files = await yemotService.getFiles(currentPath, currentUser);
      setCurrentFiles(files);
    } catch (err) {
      console.error("Failed to load files", err);
      setCurrentFiles([]); 
    } finally {
      setIsFilesLoading(false);
    }
  };

  const loadAllFolderStructure = async () => {
    if (!currentUser) return;
    try {
      if (!apiToken) {
        const folders = MOCK_FILES.filter(f => f.type === FileType.FOLDER);
        if (currentUser.role !== UserRole.ADMIN) {
           setAllFolders(folders.filter(f => currentUser.allowedPaths.some(p => f.path === p || f.path.startsWith(p + '/'))));
        } else {
           setAllFolders(folders);
        }
      } else {
        const rootFiles = await yemotService.getFiles('', currentUser);
        setAllFolders(rootFiles.filter(f => f.type === FileType.FOLDER));
      }
    } catch (e) {
      console.error("Failed to load folder structure", e);
    }
  };

  useEffect(() => {
    if (playingFile && audioRef.current) {
      audioRef.current.src = playingFile.url || '';
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.log('Autoplay blocked', e));
    }
  }, [playingFile]);

  // --- Handlers ---
  const addToLog = (fileName: string, action: LogAction) => {
    if (!currentUser) return;
    const newEntry: SystemLogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      fileName,
      timestamp: new Date().toLocaleString('he-IL'),
      userId: currentUser.id,
      action
    };
    setSystemLog(prev => [...prev, newEntry]);
  };

  const handleLogin = async (id: string, password: string) => {
    setIsLoginLoading(true);
    setLoginError(null);
    try {
      const user = await yemotService.login(id, password, allUsers);
      localStorage.setItem('yemot_active_user_id', user.id);
      setCurrentUser(user);
      setCurrentPath(''); 
      setActiveView('files');
    } catch (error: any) {
      setLoginError(error.message || 'שגיאה בהתחברות');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await yemotService.logout();
    localStorage.removeItem('yemot_active_user_id');
    setCurrentUser(null);
    setPlayingFile(null);
    setIsPlaying(false);
    if(audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
  };

  const handleNavigate = (path: string) => {
     if (path === '#') return;
     setIsSearchingMode(false);
     setSearchQuery('');
     setActiveView('files');
     setCurrentPath(path);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setIsSearchingMode(false);
      return;
    }
    setActiveView('files');
    setIsSearchingMode(true);
    setIsFilesLoading(true);
    try {
      const results = await yemotService.searchFiles(searchQuery, currentUser!);
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed", err);
      setSearchResults([]);
    } finally {
      setIsFilesLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchingMode(false);
    setSearchResults([]);
  };

  const handleDownload = async (e: React.MouseEvent, file: SystemFile) => {
    e.stopPropagation();
    if (!canUserDownload || !file.url) return;
    try {
        const response = await fetch(file.url);
        if (!response.ok) return;
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        link.click();
        window.URL.revokeObjectURL(url);
        addToLog(file.name, LogAction.DOWNLOAD);
    } catch (err) {}
  };

  const handleBulkDownload = async () => {
    if (!canUserDownload || selectedPaths.size === 0) return;
    setIsBulkDownloading(true);
    try {
      const zip = new JSZip();
      const filesToZip = activeFilesList.filter(f => selectedPaths.has(f.path) && f.type !== FileType.FOLDER);
      for (const file of filesToZip) {
        if (!file.url) continue;
        const response = await fetch(file.url);
        if (!response.ok) continue;
        const blob = await response.blob();
        zip.file(file.name, blob);
      }
      const zipContent = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipContent);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `yemot_export_${Date.now()}.zip`;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      addToLog(`חבילת קבצים (${selectedPaths.size} פריטים)`, LogAction.DOWNLOAD);
      setSelectedPaths(new Set()); 
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handleDeleteTrigger = (e: React.MouseEvent, file: SystemFile) => {
    e.stopPropagation();
    setFileToDelete(file);
  };

  const handleConfirmDelete = async () => {
      if (!fileToDelete) return;
      setIsFilesLoading(true);
      const targetPath = fileToDelete.path;
      const targetId = fileToDelete.id;
      const fileName = fileToDelete.name;
      setFileToDelete(null);
      try {
          await yemotService.deleteFile(targetPath);
          addToLog(fileName, LogAction.DELETE);
          if (playingFile?.id === targetId) {
             setPlayingFile(null);
             setIsPlaying(false);
             if(audioRef.current) audioRef.current.pause();
          }
          if (isSearchingMode) handleSearch(); else loadFiles();
      } finally {
          setIsFilesLoading(false);
      }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        await yemotService.uploadFile(currentPath, file, currentFiles);
        addToLog(file.name, LogAction.UPLOAD);
        loadFiles(); 
        alert('הקובץ הועלה בהצלחה');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const toggleSelectPath = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const newSelected = new Set(selectedPaths);
    if (newSelected.has(path)) newSelected.delete(path); else newSelected.add(path);
    setSelectedPaths(newSelected);
  };

  const toggleSelectAll = () => {
    const allFilePaths = activeFilesList.filter(f => f.type !== FileType.FOLDER).map(f => f.path);
    if (selectedPaths.size >= allFilePaths.length && allFilePaths.length > 0) setSelectedPaths(new Set()); else setSelectedPaths(new Set(allFilePaths));
  };

  const handleSaveUsers = (updatedUsers: User[]) => {
      setAllUsers(updatedUsers);
      localStorage.setItem('yemot_users', JSON.stringify(updatedUsers));
      if (currentUser) {
        const myself = updatedUsers.find(u => u.id === currentUser.id);
        if (myself) {
            setCurrentUser(myself);
            localStorage.setItem('yemot_active_user_id', myself.id);
        }
      }
  };

  const handleSaveToken = (token: string) => {
    setApiToken(token);
    localStorage.setItem('yemot_token', token);
    yemotService.setApiToken(token);
    (async () => {
        setConnectionStatus('warning');
        const isValid = await yemotService.validateToken();
        setConnectionStatus(isValid ? 'connected' : 'warning');
    })();
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) audioRef.current.volume = val;
  };

  const handleClearLogs = () => {
    setSystemLog([]);
    localStorage.removeItem('yemot_system_log');
  };

  if (!currentUser) return <LoginScreen onLogin={handleLogin} isLoading={isLoginLoading} error={loginError} />;

  const breadcrumbs = [
    { name: 'ראשי', path: '' },
    ...(isSearchingMode 
       ? [{ name: 'תוצאות חיפוש', path: '#' }] 
       : currentPath.split('/').filter(Boolean).map((part, idx, arr) => ({
           name: part,
           path: arr.slice(0, idx + 1).join('/')
         }))
    )
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" dir="rtl">
      
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        onPlay={() => setIsPlaying(true)} 
        onPause={() => setIsPlaying(false)} 
        onEnded={() => setIsPlaying(false)}
      />

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-l border-gray-200 h-full z-10 shadow-sm">
        <div className="p-6 border-b border-gray-100 bg-primary/5">
           <h1 className="text-xl font-black text-primary flex items-center gap-2">
             <Icons.Folder className="w-6 h-6" /> ניהול תכנים
           </h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-3">ניווט מהיר</p>
            <div className="space-y-1">
              <button 
                onClick={() => { setActiveView('files'); setCurrentPath(''); }} 
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all ${activeView === 'files' && currentPath === '' && !isSearchingMode ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Icons.Home className="w-5 h-5" /> תיקייה ראשית
              </button>
              
              {currentUser.role === UserRole.ADMIN && (
                <button 
                  onClick={() => setActiveView('logs')} 
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all ${activeView === 'logs' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Icons.Database className="w-5 h-5" /> יומן פעילות
                </button>
              )}
            </div>
          </div>

          <div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-3">מבנה שלוחות</p>
             <div className="space-y-1">
                {allFolders.length === 0 ? (
                  <div className="text-[10px] text-gray-400 px-3 italic">לא נמצאו שלוחות זמינות</div>
                ) : (
                  allFolders.map(folder => (
                    <button 
                      key={folder.id} 
                      onClick={() => handleNavigate(folder.path)} 
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs transition-all group ${activeView === 'files' && currentPath === folder.path ? 'bg-primary/10 text-primary font-bold border border-primary/10' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Icons.Folder className={`w-4 h-4 transition-transform ${activeView === 'files' && currentPath === folder.path ? 'scale-110' : 'text-gray-400 group-hover:text-primary'}`} />
                      <span className="truncate">{folder.name}</span>
                    </button>
                  ))
                )}
             </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-3">ניהול</p>
             <button onClick={() => isSearchingMode ? handleSearch() : loadFiles()} className="w-full flex items-center gap-3 p-3 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition-colors">
               <div className={`w-4 h-4 ${isFilesLoading ? 'animate-spin text-primary' : ''}`}>
                 <Icons.Settings className="w-4 h-4" /> 
               </div>
               רענן נתונים
             </button>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200 bg-gray-50/50">
           <div className="flex items-center gap-3 mb-4 p-2.5 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center font-bold shadow-sm">{currentUser.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-black text-gray-900 truncate">{currentUser.name}</p>
                 <p className="text-[10px] text-gray-500 font-medium">{currentUser.role === 'ADMIN' ? 'מנהל מערכת' : 'משתמש'}</p>
              </div>
           </div>
           {currentUser.role === UserRole.ADMIN && (
             <button onClick={() => setIsPermissionModalOpen(true)} className="w-full flex items-center justify-center gap-2 mb-2 p-2.5 text-xs font-black text-primary hover:bg-primary hover:text-white rounded-xl border border-primary/20 transition-all shadow-sm">
               <Icons.Shield className="w-4 h-4" /> ניהול הרשאות
             </button>
           )}
           <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-2.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors">
             <Icons.LogOut className="w-4 h-4" /> התנתק
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col gap-4 shadow-sm z-10">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide flex-1">
              {breadcrumbs.map((crumb, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {idx > 0 && <Icons.ChevronRight className="w-4 h-4 text-gray-400 rotate-180" />} 
                  <button onClick={() => handleNavigate(crumb.path)} className={`hover:text-primary hover:underline underline-offset-4 transition-colors ${idx === breadcrumbs.length - 1 ? 'font-bold text-gray-900' : ''}`}>
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mr-4 pl-2 border-l border-gray-200 flex-shrink-0 relative">
                <form onSubmit={handleSearch} className="relative group">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חיפוש קבצים..."
                    className="w-40 sm:w-64 bg-gray-100 border-none rounded-xl py-2 pr-10 pl-10 text-xs focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                     <Icons.Search className="w-4 h-4" />
                  </div>
                  {searchQuery && (
                    <button type="button" onClick={clearSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                       <Icons.Close className="w-3 h-3" />
                    </button>
                  )}
                </form>

                <div className="relative">
                  <button onClick={() => setIsSortMenuOpen(!isSortMenuOpen)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${isSortMenuOpen ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                    <Icons.Sort className="w-4 h-4" />
                    <span className="font-medium hidden sm:inline">מיון</span>
                  </button>
                  {isSortMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsSortMenuOpen(false)}></div>
                      <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-30 py-2 animate-scale-in origin-top-left">
                        <button onClick={() => { setSortBy('default'); setIsSortMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${sortBy === 'default' ? 'text-primary bg-primary/10 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><Icons.Home className="w-4 h-4" /> רגיל</button>
                        <button onClick={() => { setSortBy('name-asc'); setIsSortMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${sortBy === 'name-asc' ? 'text-primary bg-primary/10 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><Icons.SortAsc className="w-4 h-4" /> שם (עולה)</button>
                        <button onClick={() => { setSortBy('name-desc'); setIsSortMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${sortBy === 'name-desc' ? 'text-primary bg-primary/10 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><Icons.SortDesc className="w-4 h-4" /> שם (יורד)</button>
                        <button onClick={() => { setSortBy('date'); setIsSortMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${sortBy === 'date' ? 'text-primary bg-primary/10 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><Icons.Calendar className="w-4 h-4" /> תאריך</button>
                        <button onClick={() => { setSortBy('size'); setIsSortMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${sortBy === 'size' ? 'text-primary bg-primary/10 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><Icons.Size className="w-4 h-4" /> גודל</button>
                      </div>
                    </>
                  )}
                </div>

                {canUserUpload && !isSearchingMode && activeView === 'files' && (
                  <>
                    <button onClick={handleUploadClick} disabled={isUploading} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl transition-all disabled:opacity-50 active:scale-95 shadow-md shadow-primary/20">
                      {isUploading ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/> : <Icons.Upload className="w-4 h-4" />}
                      <span className="font-bold hidden sm:inline">{isUploading ? 'מעלה...' : 'העלה קובץ'}</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                  </>
                )}

                <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : connectionStatus === 'warning' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
            </div>
          </div>
        </header>

        {activeView === 'files' ? (
          <div className="flex-1 overflow-y-auto p-6 relative bg-gray-50/50 custom-scrollbar">
             {!isFilesLoading && sortedFiles.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center animate-fade-in">
                 <div className="bg-white p-8 rounded-full mb-4 shadow-inner border border-gray-100">
                   <Icons.Folder className="w-16 h-16 text-gray-200" />
                 </div>
                 <h3 className="font-black text-gray-700 text-xl">{isSearchingMode ? 'לא נמצאו תוצאות' : 'התיקייה ריקה'}</h3>
               </div>
             ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 pb-24">
                 {isFilesLoading ? (
                   Array.from({ length: 8 }).map((_, i) => <FileSkeleton key={i} />)
                 ) : (
                   sortedFiles.map(file => (
                     file.type === FileType.FOLDER ? (
                       <div key={file.id} className="flex flex-col items-center p-6 bg-white border border-gray-200 rounded-2xl hover:shadow-2xl hover:border-primary/40 transition-all group text-center animate-fade-in-up relative overflow-hidden">
                         <div className="absolute top-3 right-3 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={(e) => { e.stopPropagation(); setFileDetails(file); }} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-full transition-all">
                               <Icons.Info className="w-4 h-4" />
                            </button>
                         </div>
                         {canUserDelete && (
                            <button onClick={(e) => handleDeleteTrigger(e, file)} className="absolute top-3 left-3 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all z-20 opacity-0 group-hover:opacity-100">
                                <Icons.Delete className="w-4 h-4" />
                            </button>
                         )}
                         <button onClick={() => handleNavigate(file.path)} className="w-full flex flex-col items-center relative z-10">
                             <div className="w-20 h-20 bg-primary/5 text-primary rounded-3xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                               <Icons.Folder className="w-10 h-10 fill-current opacity-80" />
                             </div>
                             <span className="font-black text-gray-800 line-clamp-1 text-lg mb-1">{file.name}</span>
                             {isSearchingMode && <div className="text-[10px] text-primary/60 font-mono direction-ltr truncate w-full mb-1">/{file.path}</div>}
                         </button>
                       </div>
                     ) : (
                       <div key={file.id} onClick={() => setPlayingFile(file)} className={`relative flex flex-col p-5 bg-white border rounded-2xl hover:shadow-xl transition-all cursor-pointer group animate-fade-in-up ${playingFile?.id === file.id ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-gray-200 shadow-sm'}`}>
                         <div className="flex items-start justify-between mb-4">
                           <div className={`p-3 rounded-2xl shadow-sm ${file.type === FileType.AUDIO ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                              {file.type === FileType.AUDIO ? <Icons.FileAudio className="w-7 h-7" /> : <Icons.File className="w-7 h-7" />}
                           </div>
                           <div className="flex gap-1 relative z-10">
                              <button onClick={(e) => { e.stopPropagation(); setFileDetails(file); }} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-full transition-all"><Icons.Info className="w-5 h-5" /></button>
                              {canUserDelete && <button onClick={(e) => handleDeleteTrigger(e, file)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"><Icons.Delete className="w-5 h-5" /></button>}
                              {canUserDownload && <button onClick={(e) => handleDownload(e, file)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-full transition-all"><Icons.Download className="w-5 h-5" /></button>}
                           </div>
                         </div>
                         <h3 className="font-black text-gray-800 mb-1 line-clamp-2 text-sm leading-tight h-10">{file.name}</h3>
                         <div className="flex items-center justify-between text-[11px] text-gray-500 mt-auto pt-3 border-t border-gray-50 font-medium">
                            <div className="flex items-center gap-1"><Icons.Calendar className="w-3 h-3" />{file.dateModified}</div>
                            {file.size && <div className="flex items-center gap-1 font-mono">{file.size}</div>}
                         </div>
                       </div>
                     )
                   ))
                 )}
               </div>
             )}
          </div>
        ) : (
          <SystemLogsView logs={systemLog} users={allUsers} onClearLogs={handleClearLogs} />
        )}

        {/* Audio Player Bar */}
        {playingFile && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-50 px-6 py-4 animate-slide-up">
            <div className="max-w-6xl mx-auto flex items-center gap-6">
              <div className="flex items-center gap-4 min-w-[200px] max-w-xs">
                 <div className="p-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20">
                    <Icons.FileAudio className="w-5 h-5" />
                 </div>
                 <div className="truncate">
                    <p className="text-sm font-black text-gray-900 truncate">{playingFile.name}</p>
                    <p className="text-[10px] text-gray-500">/{playingFile.path}</p>
                 </div>
              </div>

              <div className="flex-1 flex items-center justify-center gap-4">
                 <button onClick={togglePlayback} className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-primary/20">
                   {isPlaying ? <Icons.Pause className="w-6 h-6 fill-current" /> : <Icons.Play className="w-6 h-6 fill-current mr-1" />}
                 </button>
              </div>

              <div className="flex items-center gap-3 w-40">
                 <button onClick={() => setIsMuted(!isMuted)} className="text-gray-400 hover:text-primary transition-colors">
                    {isMuted || volume === 0 ? <Icons.Mute className="w-5 h-5" /> : <Icons.Volume className="w-5 h-5" />}
                 </button>
                 <input 
                   type="range" 
                   min="0" 
                   max="1" 
                   step="0.01" 
                   value={isMuted ? 0 : volume} 
                   onChange={handleVolumeChange}
                   className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                 />
              </div>

              <button onClick={() => setPlayingFile(null)} className="p-2 text-gray-300 hover:text-gray-500">
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals and other components */}
      {fileDetails && (
        <div className="fixed inset-0 bg-black/70 z-[80] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-white/20">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <h3 className="font-black text-gray-800 flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg"><Icons.Info className="w-5 h-5 text-primary" /></div>
                    פרטי פריט
                 </h3>
                 <button onClick={() => setFileDetails(null)} className="text-gray-400 hover:text-gray-700 p-2 hover:bg-gray-200 rounded-full transition-all">
                    <Icons.Close className="w-6 h-6" />
                 </button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="flex flex-col items-center text-center">
                    <div className={`p-6 rounded-3xl mb-4 shadow-inner ${fileDetails.type === FileType.FOLDER ? 'bg-blue-50 text-blue-500' : 'bg-indigo-50 text-indigo-500'}`}>
                        {fileDetails.type === FileType.FOLDER ? <Icons.Folder className="w-12 h-12" /> : <Icons.FileAudio className="w-12 h-12" />}
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 break-all leading-tight">{fileDetails.name}</h2>
                 </div>
                 <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex justify-between items-center p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                       <span className="text-gray-500 font-bold">סוג</span>
                       <span className="font-bold text-gray-800">{fileDetails.type === FileType.FOLDER ? 'תיקייה' : 'קובץ'}</span>
                    </div>
                    <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                       <span className="text-gray-500 text-[10px] font-bold uppercase block mb-1">תאריך</span>
                       <span className="font-bold text-gray-800 flex items-center gap-2">
                          <Icons.Calendar className="w-3 h-3 text-primary" />
                          {fileDetails.fullDate || fileDetails.dateModified}
                       </span>
                    </div>
                    <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                       <span className="text-gray-500 text-[10px] font-bold uppercase block mb-1">נתיב</span>
                       <span className="font-mono text-gray-800 text-[10px] direction-ltr break-all">{fileDetails.path}</span>
                    </div>
                 </div>
              </div>
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                 <button onClick={() => setFileDetails(null)} className="flex-1 px-6 py-3.5 bg-white border border-gray-200 text-gray-700 font-black rounded-2xl hover:bg-gray-100 transition-all shadow-sm active:scale-95">סגור</button>
              </div>
           </div>
        </div>
      )}

      {fileToDelete && (
        <div className="fixed inset-0 bg-black/70 z-[90] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in border border-red-100">
              <div className="p-6 text-center">
                 <div className={`w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 ${fileToDelete.type === FileType.FOLDER ? 'animate-pulse' : 'animate-bounce'}`}>
                    {fileToDelete.type === FileType.FOLDER ? <Icons.Folder className="w-8 h-8" /> : <Icons.Delete className="w-8 h-8" />}
                 </div>
                 <h3 className="text-xl font-black text-gray-800 mb-2">
                    אישור מחיקת {fileToDelete.type === FileType.FOLDER ? 'תיקייה' : 'קובץ'}
                 </h3>
                 <p className="text-gray-500 text-sm mb-6 px-4">
                    האם אתה בטוח שברצונך למחוק לצמיתות את {fileToDelete.type === FileType.FOLDER ? 'התיקייה' : 'הקובץ'} <span className="font-bold text-gray-800 break-all">"{fileToDelete.name}"</span>?
                    {fileToDelete.type === FileType.FOLDER && (
                      <span className="block mt-2 text-red-600 font-bold text-xs underline underline-offset-2">שים לב: מחיקת תיקייה תמחוק גם את כל התוכן שבתוכה!</span>
                    )}
                 </p>
                 <div className="flex flex-col gap-2">
                    <button onClick={handleConfirmDelete} className="w-full py-3.5 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 shadow-lg shadow-red-900/20 transition-all active:scale-95">
                       {fileToDelete.type === FileType.FOLDER ? 'אני מבין, מחק את כל התיקייה' : 'כן, מחק פריט זה'}
                    </button>
                    <button onClick={() => setFileToDelete(null)} className="w-full py-3.5 bg-gray-100 text-gray-700 font-black rounded-2xl hover:bg-gray-200 transition-all active:scale-95">ביטול</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isPermissionModalOpen && currentUser && (
        <PermissionsModal users={allUsers} folders={currentFiles} apiToken={apiToken} currentUser={currentUser} onClose={() => setIsPermissionModalOpen(false)} onSaveUsers={handleSaveUsers} onSaveToken={handleSaveToken} />
      )}
      {activeView === 'files' && <AIChat currentFiles={currentFiles} />}
    </div>
  );
};

export default App;
