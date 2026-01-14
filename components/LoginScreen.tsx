
import React, { useState } from 'react';
import { Icons } from './Icons';

interface LoginScreenProps {
  onLogin: (id: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, isLoading, error }) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(id, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col items-center justify-center p-4" dir="rtl">
      
      {/* Brand */}
      <div className="mb-8 text-center animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl mb-4 text-primary shadow-lg shadow-blue-900/10">
          <Icons.Folder className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">מערכת ניהול משתמשים</h1>
        <p className="text-gray-500 mt-2">מערכת ניהול תכנים מתקדמת</p>
      </div>

      {/* Login Card */}
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">התחבר למערכת</h2>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-r-4 border-red-500 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <Icons.Shield className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ID Input */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 block">מספר מערכת / מזהה</label>
            <div className="relative group">
              <div className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 group-focus-within:text-primary transition-colors">
                <Icons.User className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pr-10 pl-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="הכנס מזהה משתמש"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 block">סיסמה</label>
            <div className="relative group">
              <div className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 group-focus-within:text-primary transition-colors">
                <Icons.Shield className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pr-10 pl-10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                 <span className="text-xs font-medium">{showPassword ? 'הסתר' : 'הצג'}</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 hover:bg-blue-800 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                מתחבר...
              </>
            ) : (
              'התחבר'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-4">
            לצורכי הדגמה:
            <br />
            מנהל: 1 (1)
            <br />
            משתמש: 0509999999 (1234)
          </p>
          <div className="text-xs text-gray-500">
             <span className="font-medium">פותח ע"י דוד ארן</span>
             <br />
             <a href="mailto:earono630630@gmail.com" className="text-gray-400 hover:text-primary transition-colors">earono630630@gmail.com</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
