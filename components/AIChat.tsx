import React, { useState } from 'react';
import { Icons } from './Icons';
import { SystemFile } from '../types';
import { analyzeFolderContent } from '../services/geminiService';

interface AIChatProps {
  currentFiles: SystemFile[];
}

const AIChat: React.FC<AIChatProps> = ({ currentFiles }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setResponse(null);
    
    const result = await analyzeFolderContent(currentFiles, query);
    setResponse(result);
    setIsLoading(false);
    setQuery('');
  };

  return (
    <div className="fixed bottom-24 left-6 z-40 flex flex-col items-start gap-4" dir="rtl">
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 sm:w-96 overflow-hidden animate-fade-in-up">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <Icons.Sparkles className="w-5 h-5" />
              <h3 className="font-bold">עוזר חכם</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full">
              <Icons.Close className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-4 max-h-80 overflow-y-auto bg-gray-50 min-h-[200px]">
             {!response && !isLoading && (
               <div className="text-center text-gray-400 mt-8">
                 <p className="text-sm">שאל אותי שאלות על הקבצים בתיקייה זו.</p>
                 <p className="text-xs mt-2">לדוגמה: "מה הנושא של השיעורים כאן?" או "מצא את ההקלטה הכי ארוכה".</p>
               </div>
             )}

             {isLoading && (
               <div className="flex justify-center items-center h-20 space-x-2 space-x-reverse">
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
               </div>
             )}

             {response && (
               <div className="bg-white p-3 rounded-xl rounded-tr-none shadow-sm border border-gray-100 text-sm leading-relaxed text-gray-700">
                 {response}
               </div>
             )}
          </div>

          <form onSubmit={handleSubmit} className="p-3 border-t bg-white flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="שאל על הקבצים..."
              className="flex-1 bg-gray-100 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button 
              type="submit" 
              disabled={isLoading || !query.trim()}
              className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icons.Search className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`shadow-lg hover:shadow-xl transform transition-all hover:-translate-y-1 p-4 rounded-full flex items-center gap-2 ${
          isOpen ? 'bg-gray-800 text-white' : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
        }`}
      >
        <Icons.Sparkles className="w-6 h-6" />
        {!isOpen && <span className="font-bold text-sm hidden sm:inline">שאל את ה-AI</span>}
      </button>
    </div>
  );
};

export default AIChat;