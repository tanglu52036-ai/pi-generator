/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { Lock, LogOut, Eye, EyeOff } from 'lucide-react';

const STORAGE_KEY = 'pm_authenticated';
const CORRECT_PASSWORD = 'loyo2026';

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  login: () => false,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const PasswordGateProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const login = (password: string): boolean => {
    if (password === CORRECT_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsAuthenticated(true);
      setError(false);
      return true;
    }
    setError(true);
    return false;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
    setInputValue('');
    setError(false);
  };

  if (isAuthenticated) {
    return (
      <AuthContext.Provider value={{ isAuthenticated: true, login, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: false, login, logout }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
              <Lock className="w-7 h-7 text-blue-600" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-black text-slate-900">Product Manager</h2>
              <p className="text-xs text-slate-500 mt-1">Enter password to access</p>
            </div>

            <div className="w-full space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); setError(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') login(inputValue); }}
                  placeholder="Password"
                  autoFocus
                  className={`block w-full px-4 py-2.5 pr-12 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    error
                      ? 'border-red-300 focus:ring-red-500 bg-red-50'
                      : 'border-slate-300 focus:ring-blue-500 bg-white'
                  }`}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-500 font-medium text-center">Incorrect password</p>
              )}
              <button
                onClick={() => login(inputValue)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm transition-colors cursor-pointer"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthContext.Provider>
  );
};

export const LogoutButton = () => {
  const { logout } = useAuth();
  return (
    <button
      onClick={logout}
      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 font-medium transition-colors cursor-pointer"
    >
      <LogOut className="w-3 h-3" />
      Logout
    </button>
  );
};