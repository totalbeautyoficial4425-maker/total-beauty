import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { storageService, hashPassword } from '../services/storage';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  requiresPasswordChange: boolean;
  loginAttempts: number;
  isLockedOut: boolean;
  lockoutRemainingSeconds: number;
  login: (usernameOrEmail: string, passwordPlain: string, rememberMe?: boolean) => { success: boolean; error?: string };
  changePassword: (newPasswordPlain: string) => { success: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 3 * 60 * 1000; // 3 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState<boolean>(false);
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState<number>(0);

  // Restore session
  useEffect(() => {
    try {
      const sessionRaw = localStorage.getItem('tb_session_v1');
      if (sessionRaw) {
        const sessionUser: User = JSON.parse(sessionRaw);
        const users = storageService.getUsers();
        const freshUser = users.find(u => u.id === sessionUser.id);
        if (freshUser) {
          setCurrentUser(freshUser);
          setRequiresPasswordChange(freshUser.forcePasswordChange);
        }
      }
    } catch (err) {
      console.error('Error restoring auth session:', err);
    }
  }, []);

  // Lockout timer ticker
  useEffect(() => {
    if (!lockoutUntil) {
      setLockoutRemainingSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutRemainingSeconds(remaining);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setLoginAttempts(0);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const login = (usernameOrEmail: string, passwordPlain: string, rememberMe = true): { success: boolean; error?: string } => {
    // Check brute force lockout
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const secs = Math.ceil((lockoutUntil - Date.now()) / 1000);
      return { 
        success: false, 
        error: `Muitas tentativas incorretas. Sistema temporariamente bloqueado por segurança. Aguarde ${secs} segundos.` 
      };
    }

    const cleanInput = usernameOrEmail.trim().toLowerCase();
    const users = storageService.getUsers();

    const matchedUser = users.find(
      u => u.username.toLowerCase() === cleanInput || u.email.toLowerCase() === cleanInput
    );

    if (!matchedUser) {
      handleFailedAttempt();
      return { success: false, error: 'Usuário ou senha incorretos.' };
    }

    const currentHash = storageService.getUserPasswordHash(matchedUser.id);
    const providedHash = hashPassword(passwordPlain);

    if (currentHash !== providedHash) {
      handleFailedAttempt();
      return { success: false, error: 'Usuário ou senha incorretos.' };
    }

    // Login successful - Reset failed attempts
    setLoginAttempts(0);
    setLockoutUntil(null);

    const updatedUser: User = {
      ...matchedUser,
      lastLogin: new Date().toISOString(),
    };

    // Update user in storage
    const updatedUsers = users.map(u => (u.id === updatedUser.id ? updatedUser : u));
    storageService.saveUsers(updatedUsers);

    setCurrentUser(updatedUser);
    setRequiresPasswordChange(updatedUser.forcePasswordChange);

    if (rememberMe) {
      localStorage.setItem('tb_session_v1', JSON.stringify(updatedUser));
    } else {
      sessionStorage.setItem('tb_session_v1', JSON.stringify(updatedUser));
    }

    return { success: true };
  };

  const handleFailedAttempt = () => {
    const nextAttempts = loginAttempts + 1;
    setLoginAttempts(nextAttempts);
    if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_DURATION_MS;
      setLockoutUntil(until);
      setLockoutRemainingSeconds(Math.ceil(LOCKOUT_DURATION_MS / 1000));
    }
  };

  const changePassword = (newPasswordPlain: string): { success: boolean; error?: string } => {
    if (!currentUser) {
      return { success: false, error: 'Nenhum usuário conectado.' };
    }

    if (newPasswordPlain.length < 6) {
      return { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' };
    }

    if (newPasswordPlain === 'admin123') {
      return { success: false, error: 'A nova senha não pode ser a senha padrão provisória (admin123).' };
    }

    // Save new hash
    storageService.setUserPassword(currentUser.id, newPasswordPlain);

    // Remove forcePasswordChange
    const users = storageService.getUsers();
    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id) {
        return { ...u, forcePasswordChange: false };
      }
      return u;
    });
    storageService.saveUsers(updatedUsers);

    const updatedCurrent = { ...currentUser, forcePasswordChange: false };
    setCurrentUser(updatedCurrent);
    setRequiresPasswordChange(false);
    localStorage.setItem('tb_session_v1', JSON.stringify(updatedCurrent));

    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    setRequiresPasswordChange(false);
    localStorage.removeItem('tb_session_v1');
    sessionStorage.removeItem('tb_session_v1');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        requiresPasswordChange,
        loginAttempts,
        isLockedOut: !!lockoutUntil && Date.now() < lockoutUntil,
        lockoutRemainingSeconds,
        login,
        changePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
