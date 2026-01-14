
import React, { useState, useEffect } from 'react';
import { User, SystemFile, FileType, UserRole } from '../types';
import { Icons } from './Icons';
import { yemotService } from '../services/yemotService';

interface PermissionsModalProps {
  users: User[];
  folders: SystemFile[]; 
  apiToken: string;
  currentUser: User; 
  onClose: () => void;
  onSaveUsers: (updatedUsers: User[]) => void;
  onSaveToken: (token: string) => void;
}

type Tab = 'users' | 'permissions' | 'connection';

const PermissionsModal: React.FC<PermissionsModalProps> = ({ 
  users, 
  apiToken,
  currentUser,
  onClose, 
  onSaveUsers,
  onSaveToken
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [localUsers, setLocalUsers] = useState<User[]>(JSON.parse(JSON.stringify(users)));
  const [localToken, setLocalToken] = useState(apiToken);
  const [selectedUserId, setSelectedUserId] = useState<string>(localUsers[0]?.id || '');
  
  // Token Visibility State
  const [showToken, setShowToken] = useState(false);
  const [isTokenSaved, setIsTokenSaved] = useState(false);
  
  // New User Form State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState<{ name: string; id: string; password: string; role: UserRole; canUpload: boolean; canDelete: boolean; canDownload: boolean }>({ 
    name: '', 
    id: '', 
    password: '', 
    role: UserRole.USER,
    canUpload: false,
    canDelete: false,
    canDownload: true
  });

  // Permissions Browsing State
  const [browsingPath, setBrowsingPath] = useState('');
  const [browsingFiles, setBrowsingFiles] = useState<SystemFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const selectedUser = localUsers.find(u => u.id === selectedUserId);

  // --- Effects ---
  useEffect(() => {
    if (activeTab === 'permissions') {
      fetchBrowsingFiles(browsingPath);
    }
  }, [activeTab, browsingPath]);

  const fetchBrowsingFiles = async (path: string) => {
    setIsLoadingFiles(true);
    try {
      const files = await yemotService.getFiles(path, currentUser);
      setBrowsingFiles(files.filter(f => f.type === FileType.FOLDER));
    } catch (error) {
      console.error("Error fetching files for permissions:", error);
      setBrowsingFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // --- Actions ---

  const handleSaveAll = () => {
    onSaveUsers(localUsers);
    onSaveToken(localToken);
    onClose();
  };

  const handleQuickSaveToken = () => {
    onSaveToken(localToken);
    setIsTokenSaved(true);
    setTimeout(() => setIsTokenSaved(false), 3000);
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.id || !newUser.password) return;
    
    const userToAdd: User = {
      id: newUser.id,
      name: newUser.name,
      password: newUser.password,
      role: newUser.role, 
      allowedPaths: [],
      canUpload: newUser.role === UserRole.ADMIN ? true : newUser.canUpload,
      canDelete: newUser.role === UserRole.ADMIN ? true : newUser.canDelete,
      canDownload: newUser.role === UserRole.ADMIN ? true : newUser.canDownload
    };

    setLocalUsers([...localUsers, userToAdd]);
    setNewUser({ name: '', id: '', password: '', role: UserRole.USER, canUpload: false, canDelete: false, canDownload: true }); 
    setIsAddingUser(false);
    setSelectedUserId(userToAdd.id);
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) {
      const filtered = localUsers.filter(u => u.id !== userId);
      setLocalUsers(filtered);
      if (selectedUserId === userId) setSelectedUserId(filtered[0]?.id || '');
    }
  };

  const handleUpdatePassword = (userId: string, newPass: string) => {
    setLocalUsers(localUsers.map(u => u.id === userId ? { ...u, password: newPass } : u));
  };

  const handleUpdateGranularPermission = (userId: string, field: 'canUpload' | 'canDelete' | 'canDownload', value: boolean) => {
    setLocalUsers(localUsers.map(u => u.id === userId ? { ...u, [field]: value } : u));
  };

  const togglePermission = (path: string) => {
    if (!selectedUser) return;
    
    const updatedUsers = localUsers.map(user => {
      if (user.id === selectedUser.id) {
        const hasAccess = user.allowedPaths.includes(path);
        let newPaths = [...user.allowedPaths];
        if (hasAccess) {
          newPaths = newPaths.filter(p => p !== path);
        } else {
          newPaths.push(path);
        }
        return { ...user, allowedPaths: newPaths };
      }
      return user;
    });
    setLocalUsers(updatedUsers);
  };

  const navigateUp = () => {
    if (browsingPath === '') return;
    const parts = browsingPath.split('/');
    parts.pop();
    setBrowsingPath(parts.join('/'));
  };

  // --- Tab Rendering ---

  const renderUsersTab = () => (
    <div className="flex h-full">
      <div className="w-1/3 bg-gray-50 border-l border-gray-200 overflow-y-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-700 text-sm">רשימת משתמשים</h3>
          <button onClick={() => setIsAddingUser(true)} className="p-1 bg-primary text-white rounded hover:bg-blue-700 transition-colors" title="הוסף משתמש">
             <Icons.User className="w-4 h-4" /> 
          </button>
        </div>
        <div className="space-y-2">
          {localUsers.map(user => (
            <div key={user.id} onClick={() => { setSelectedUserId(user.id); setIsAddingUser(false); }} className={`p-3 rounded-lg cursor-pointer flex items-center justify-between group ${selectedUserId === user.id && !isAddingUser ? 'bg-white shadow border-r-4 border-primary' : 'hover:bg-gray-100'}`}>
              <div className="flex items-center gap-2 overflow-hidden">
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${user.role === 'ADMIN' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  {user.name.charAt(0)}
                </div>
                <div className="truncate">
                  <div className="font-medium text-sm text-gray-900 truncate">{user.name}</div>
                  <div className="text-[10px] text-gray-500">{user.id}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="w-2/3 p-6 bg-white overflow-y-auto">
        {isAddingUser ? (
           <div className="max-w-xs mx-auto animate-fade-in-up">
              <h3 className="text-lg font-bold mb-4 text-primary">הוספת משתמש חדש</h3>
              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">שם המשתמש</label>
                    <input type="text" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">מזהה כניסה</label>
                    <input type="text" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none" value={newUser.id} onChange={e => setNewUser({...newUser, id: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
                    <input type="text" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">סוג חשבון</label>
                    <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none bg-white">
                        <option value={UserRole.USER}>משתמש רגיל</option>
                        <option value={UserRole.ADMIN}>מנהל מערכת</option>
                    </select>
                 </div>
                 <div className="flex gap-2 pt-2">
                    <button onClick={handleAddUser} className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-blue-700">שמור</button>
                    <button onClick={() => setIsAddingUser(false)} className="px-4 py-2 border rounded-lg">ביטול</button>
                 </div>
              </div>
           </div>
        ) : selectedUser ? (
          <div className="max-w-sm mx-auto">
             <div className="text-center mb-6">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-bold mb-3 ${selectedUser.role === 'ADMIN' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  {selectedUser.name.charAt(0)}
                </div>
                <h2 className="text-lg font-bold text-gray-800">{selectedUser.name}</h2>
                <p className="text-xs text-gray-500">{selectedUser.role === 'ADMIN' ? 'מנהל מערכת' : 'משתמש'}</p>
             </div>
             <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
                <div>
                   <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">מזהה כניסה</label>
                   <div className="font-mono text-gray-800 bg-white p-2 rounded border border-gray-200 text-sm">{selectedUser.id}</div>
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">סיסמה</label>
                   <input type="text" value={selectedUser.password || ''} onChange={(e) => handleUpdatePassword(selectedUser.id, e.target.value)} className="w-full bg-white border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                {selectedUser.role !== UserRole.ADMIN && (
                  <div className="pt-4 border-t border-gray-200 space-y-3">
                     <label className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200 cursor-pointer">
                        <input type="checkbox" checked={selectedUser.canUpload} onChange={e => handleUpdateGranularPermission(selectedUser.id, 'canUpload', e.target.checked)} className="w-4 h-4 text-primary" />
                        <span className="text-sm">העלאה</span>
                     </label>
                     <label className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200 cursor-pointer">
                        <input type="checkbox" checked={selectedUser.canDelete} onChange={e => handleUpdateGranularPermission(selectedUser.id, 'canDelete', e.target.checked)} className="w-4 h-4 text-primary" />
                        <span className="text-sm">מחיקה</span>
                     </label>
                     <label className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200 cursor-pointer">
                        <input type="checkbox" checked={selectedUser.canDownload} onChange={e => handleUpdateGranularPermission(selectedUser.id, 'canDownload', e.target.checked)} className="w-4 h-4 text-primary" />
                        <span className="text-sm">הורדה</span>
                     </label>
                  </div>
                )}
                <button onClick={() => handleDeleteUser(selectedUser.id)} className="w-full mt-4 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 p-2 rounded-lg border border-red-200 text-sm">
                    מחק משתמש
                </button>
             </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">בחר משתמש</div>
        )}
      </div>
    </div>
  );

  const renderPermissionsTab = () => (
    <div className="flex h-full">
       <div className="w-1/3 bg-gray-50 border-l border-gray-200 overflow-y-auto p-4">
         <h3 className="font-bold text-gray-700 text-sm mb-4">בחר משתמש</h3>
         <div className="space-y-2">
           {localUsers.filter(u => u.role !== 'ADMIN').map(user => (
             <button key={user.id} onClick={() => setSelectedUserId(user.id)} className={`w-full text-right p-3 rounded-lg flex items-center gap-2 transition-all ${selectedUserId === user.id ? 'bg-white shadow border-r-4 border-primary' : 'hover:bg-gray-100 text-gray-600'}`}>
               <Icons.User className={`w-4 h-4 ${selectedUserId === user.id ? 'text-primary' : 'text-gray-400'}`} />
               <span className="font-medium text-sm">{user.name}</span>
             </button>
           ))}
         </div>
       </div>
       <div className="w-2/3 p-6 bg-white flex flex-col h-full overflow-hidden">
          {selectedUser && selectedUser.role !== 'ADMIN' ? (
             <>
                <div className="mb-4">
                  <h3 className="font-bold text-sm">הרשאות תיקיות ל: <span className="text-primary">{selectedUser.name}</span></h3>
                </div>
                <div className="flex items-center gap-2 mb-4 bg-gray-50 p-2 rounded-lg text-xs font-mono">
                   <button onClick={navigateUp} disabled={!browsingPath} className="p-1 disabled:opacity-30"><Icons.ChevronRight className="w-4 h-4 rotate-180" /></button>
                   <span className="truncate">/{browsingPath}</span>
                </div>
                <div className="flex-1 overflow-y-auto border rounded-lg bg-white">
                  {isLoadingFiles ? (
                    <div className="p-10 text-center"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div></div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                       {browsingFiles.map(folder => {
                         const isDirectlyAllowed = selectedUser.allowedPaths.includes(folder.path);
                         const isInherited = selectedUser.allowedPaths.some(p => folder.path.startsWith(p + '/'));
                         return (
                           <div key={folder.id} className="flex items-center p-3 hover:bg-gray-50">
                              <input type="checkbox" checked={isDirectlyAllowed || isInherited} disabled={isInherited} onChange={() => !isInherited && togglePermission(folder.path)} className="w-4 h-4 text-primary ml-3" />
                              <button onClick={() => setBrowsingPath(folder.path)} className="flex-1 text-right text-sm hover:text-primary transition-colors flex items-center gap-2">
                                 <Icons.Folder className={`w-4 h-4 ${isDirectlyAllowed || isInherited ? 'text-primary' : 'text-gray-400'}`} />
                                 {folder.name}
                              </button>
                              {isInherited && <span className="text-[10px] text-green-600 bg-green-50 px-1 rounded">מורשה</span>}
                           </div>
                         );
                       })}
                    </div>
                  )}
                </div>
             </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center text-sm p-4">
               <Icons.Shield className="w-12 h-12 opacity-10 mb-2" />
               <p>בחר משתמש רגיל להגדרת הרשאות תיקיות.</p>
            </div>
          )}
       </div>
    </div>
  );

  const renderConnectionTab = () => (
     <div className="p-8 max-w-lg mx-auto h-full flex flex-col items-center justify-center">
        <div className="mb-6 text-center">
           <Icons.Settings className="w-12 h-12 text-primary mx-auto mb-4" />
           <h3 className="text-xl font-bold">חיבור למערכת (Token)</h3>
           <p className="text-gray-500 text-sm mt-1">הטוקן נשמר בדפדפן לצורך גישה רציפה למערכת.</p>
        </div>
        <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-6">
           <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">מפתח API פעיל</label>
           <div className="relative mb-6">
              <input 
                type={showToken ? "text" : "password"}
                value={localToken}
                onChange={(e) => setLocalToken(e.target.value)}
                placeholder="הדבק כאן את הטוקן..."
                className="w-full border-2 border-gray-200 rounded-xl py-3 px-4 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none font-mono text-sm"
              />
              <button onClick={() => setShowToken(!showToken)} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                 {showToken ? 'הסתר' : 'הצג'}
              </button>
           </div>
           
           <button 
             onClick={handleQuickSaveToken}
             className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
               isTokenSaved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-blue-800'
             }`}
           >
              {isTokenSaved ? <Icons.Check className="w-5 h-5" /> : <Icons.Archive className="w-5 h-5" />}
              {isTokenSaved ? 'נשמר בהצלחה!' : 'שמור טוקן עכשיו'}
           </button>
        </div>
     </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-scale-in">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white z-10 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Icons.Settings className="w-5 h-5 text-primary" />
            הגדרות מערכת
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-all">
            <Icons.Close className="w-6 h-6" />
          </button>
        </div>
        <div className="flex border-b border-gray-200 px-4 bg-gray-50/50">
           <button onClick={() => setActiveTab('users')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>משתמשים</button>
           <button onClick={() => setActiveTab('permissions')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'permissions' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>הרשאות תיקיות</button>
           <button onClick={() => setActiveTab('connection')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'connection' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>חיבור API</button>
        </div>
        <div className="flex-1 overflow-hidden relative">{activeTab === 'users' && renderUsersTab()}{activeTab === 'permissions' && renderPermissionsTab()}{activeTab === 'connection' && renderConnectionTab()}</div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 z-10">
          <button onClick={onClose} className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg">ביטול</button>
          <button onClick={handleSaveAll} className="px-6 py-2 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-blue-800 active:scale-95 transition-all">סיום ושמירה</button>
        </div>
      </div>
    </div>
  );
};

export default PermissionsModal;
