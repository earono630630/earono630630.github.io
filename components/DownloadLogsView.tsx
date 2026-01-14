
import React, { useState } from 'react';
import { Icons } from './Icons';
import { SystemLogEntry, User, LogAction } from '../types';

interface SystemLogsViewProps {
  logs: SystemLogEntry[];
  users: User[];
  onClearLogs: () => void;
}

const SystemLogsView: React.FC<SystemLogsViewProps> = ({ logs, users, onClearLogs }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : userId;
  };

  const filteredLogs = logs.filter(log => {
    const userName = getUserName(log.userId).toLowerCase();
    const fileName = log.fileName.toLowerCase();
    const search = searchTerm.toLowerCase();
    return userName.includes(search) || fileName.includes(search);
  }).reverse();

  const getActionStyles = (action: LogAction) => {
    switch (action) {
      case LogAction.DOWNLOAD:
        return { 
          icon: <Icons.Download className="w-6 h-6" />, 
          bg: 'bg-indigo-50', 
          text: 'text-indigo-600', 
          label: 'הורדה' 
        };
      case LogAction.UPLOAD:
        return { 
          icon: <Icons.Upload className="w-6 h-6" />, 
          bg: 'bg-green-50', 
          text: 'text-green-600', 
          label: 'העלאה' 
        };
      case LogAction.DELETE:
        return { 
          icon: <Icons.Delete className="w-6 h-6" />, 
          bg: 'bg-red-50', 
          text: 'text-red-600', 
          label: 'מחיקה' 
        };
      default:
        return { 
          icon: <Icons.File className="w-6 h-6" />, 
          bg: 'bg-gray-50', 
          text: 'text-gray-600', 
          label: 'פעולה' 
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-6 overflow-hidden animate-fade-in">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-800 mb-2 flex items-center gap-3">
             <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                <Icons.Database className="w-8 h-8" />
             </div>
             יומן פעילות מערכתי
          </h2>
          <p className="text-gray-500 font-medium">מעקב אחר הורדות, העלאות ומחיקות של משתמשים במערכת</p>
        </div>
        
        <div className="flex gap-4">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="חיפוש ביומן..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all w-64 shadow-sm"
            />
            <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          
          <button 
            onClick={() => {
              if (confirm('האם אתה בטוח שברצונך למחוק את כל היסטוריית הפעילות?')) {
                onClearLogs();
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all font-bold text-sm border border-red-100"
          >
            <Icons.Delete className="w-4 h-4" />
            נקה יומן
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
        {filteredLogs.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
            <Icons.Files className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-bold">לא נמצאו רשומות ביומן</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredLogs.map((log) => {
              const styles = getActionStyles(log.action);
              return (
                <div key={log.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 ${styles.bg} ${styles.text} rounded-xl flex items-center justify-center shadow-inner`}>
                      {styles.icon}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${styles.bg} ${styles.text}`}>
                          {styles.label}
                        </span>
                        <h4 className="font-black text-gray-800 text-lg group-hover:text-primary transition-colors">{log.fileName}</h4>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                          <Icons.User className="w-3 h-3" />
                          {getUserName(log.userId)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Icons.Calendar className="w-3 h-3" />
                          {log.timestamp}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-all text-[10px] font-mono text-gray-300">
                    ID: {log.id}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemLogsView;
