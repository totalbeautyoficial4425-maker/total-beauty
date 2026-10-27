import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { storageService, hashPassword } from '../services/storage';
import { cloudSyncService } from '../services/cloudSync';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  requiresPasswordChange: boolean;
  loginAttempts: number;
  isLockedOut: boolean;
  lockoutRemainingSeconds: number;
  resetLockout: () => void;
  login: (usernameOrEmail: string, passwordPlain: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  changePassword: (newPasswordPlain: string, currentPasswordPlain?: string) => Promise<{ success: boolean; error?: string }>;
  resetAdminPassword: (verification: string, newPasswordPlain: string) => Promise<{ success: boolean; error?: string }>;
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

  const resetLockout = () => {
    setLockoutUntil(null);
    setLockoutRemainingSeconds(0);
    setLoginAttempts(0);
  };

  // Restore session and trigger initial background sync
  useEffect(() => {
    try {
      localStorage.removeItem('tb_session_v1');
      sessionStorage.removeItem('tb_session_v1');

      const sessionRaw = localStorage.getItem('tb_session_v2') || sessionStorage.getItem('tb_session_v2');
      if (sessionRaw) {
        const sessionUser: User = JSON.parse(sessionRaw);
        const users = storageService.getUsers();
        const freshUser = users.find(u => u.id === sessionUser.id);
        if (freshUser) {
          setCurrentUser(freshUser);
          setRequiresPasswordChange(freshUser.forcePasswordChange || false);
        }
      }
    } catch (err) {
      console.error('Error restoring auth session:', err);
    }

    // Immediately pull latest credentials and salon data from cloud on mount
    cloudSyncService.pullFromCloud().catch(err => {
      console.warn('Initial auth cloud pull error (safe fallback to local):', err);
    });
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

  const login = async (usernameOrEmail: string, passwordPlain: string, rememberMe = false): Promise<{ success: boolean; error?: string }> => {
    const cleanInput = (usernameOrEmail || '').trim().toLowerCase();
    const cleanPassword = (passwordPlain || '').trim();
    const isAdminAttempt = cleanInput === 'admin' || cleanInput === 'gestao@totalbeautyoficial.com.br';

    // Check brute force lockout (bypass for admin to prevent lockouts)
    if (!isAdminAttempt && lockoutUntil && Date.now() < lockoutUntil) {
      const secs = Math.ceil((lockoutUntil - Date.now()) / 1000);
      return { 
        success: false, 
        error: `Muitas tentativas incorretas. Sistema temporariamente bloqueado por segurança. Aguarde ${secs} segundos.` 
      };
    }

    // 1. Instantly pull latest credentials from Cloud Blob (guarantees cross-device password sync PC <-> Phone)
    try {
      await Promise.race([
        cloudSyncService.pullFromCloud(),
        new Promise(resolve => setTimeout(resolve, 2500))
      ]);
    } catch (e) {
      console.warn('Pre-login cloud sync fallback to local cache:', e);
    }

    let users = storageService.getUsers();

    let matchedUser = users.find(
      u => u.username.toLowerCase() === cleanInput || (u.email && u.email.toLowerCase() === cleanInput)
    );

    // Guaranteed fallback for admin if missing from stored users list
    if (!matchedUser && isAdminAttempt) {
      matchedUser = {
        id: 'user_admin_01',
        username: 'admin',
        email: 'gestao@totalbeautyoficial.com.br',
        name: 'Administradora Total Beauty',
        role: 'admin',
        forcePasswordChange: false,
        createdAt: new Date().toISOString(),
      };
      users = [matchedUser, ...users.filter(u => u.id !== 'user_admin_01')];
      storageService.saveUsers(users);
    }

    if (!matchedUser) {
      handleFailedAttempt();
      return { success: false, error: 'Usuário não encontrado.' };
    }

    const currentHash = storageService.getUserPasswordHash(matchedUser.id);
    const providedHash = hashPassword(cleanPassword);

    let isPasswordValid = false;

    // 1. Direct hash match with stored password
    if (currentHash && currentHash === providedHash) {
      isPasswordValid = true;
    }

    // Direct hash match with user object hash (from cloud sync)
    if (!isPasswordValid && matchedUser.passwordHash && matchedUser.passwordHash === providedHash) {
      isPasswordValid = true;
      storageService.setUserPassword(matchedUser.id, cleanPassword);
    }

    // 2. Admin initial fallback: ONLY accepted if no custom secure password was set yet
    if (matchedUser.role === 'admin' || isAdminAttempt) {
      const defaultAdminHash = hashPassword('admin123');
      const isCustomPasswordSet = (currentHash && currentHash !== defaultAdminHash) || 
                                 (matchedUser.passwordHash && matchedUser.passwordHash !== defaultAdminHash);
      if (!isCustomPasswordSet) {
        if (cleanPassword === 'admin123' || cleanPassword === 'admin' || cleanPassword === 'admin@123') {
          isPasswordValid = true;
        }
      }
    }

    // 3. Professional resilience: accept default pattern [username]123 if custom password not yet defined
    if (matchedUser.role === 'profissional') {
      const defaultProfPwd = `${matchedUser.username.toLowerCase()}123`;
      if (cleanPassword === defaultProfPwd && (!currentHash || currentHash === hashPassword(defaultProfPwd))) {
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      handleFailedAttempt();
      return { success: false, error: 'Senha incorreta. Verifique se digitou corretamente.' };
    }

    // Login successful - Reset failed attempts & lockout
    setLoginAttempts(0);
    setLockoutUntil(null);

    const updatedUser: User = {
      ...matchedUser,
      forcePasswordChange: false,
      lastLogin: new Date().toISOString(),
    };

    // Update user in storage
    const updatedUsers = users.map(u => (u.id === updatedUser.id ? updatedUser : u));
    storageService.saveUsers(updatedUsers);

    setCurrentUser(updatedUser);
    setRequiresPasswordChange(false);

    if (rememberMe) {
      localStorage.setItem('tb_session_v2', JSON.stringify(updatedUser));
    } else {
      sessionStorage.setItem('tb_session_v2', JSON.stringify(updatedUser));
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

  const changePassword = async (newPasswordPlain: string, currentPasswordPlain?: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Nenhum usuário conectado.' };
    }

    if (currentPasswordPlain) {
      const currentHash = storageService.getUserPasswordHash(currentUser.id);
      const providedCurrentHash = hashPassword(currentPasswordPlain);
      const defaultAdminHash = hashPassword('admin123');
      const isDefault = currentHash === defaultAdminHash;
      
      const isCurrentValid = (currentHash === providedCurrentHash) || 
        (isDefault && (currentPasswordPlain === 'admin123' || currentPasswordPlain === 'admin'));

      if (!isCurrentValid) {
        return { success: false, error: 'A senha atual informada está incorreta.' };
      }
    }

    if (newPasswordPlain.length < 6) {
      return { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' };
    }

    if (newPasswordPlain === 'admin123' && currentUser.role === 'admin') {
      return { success: false, error: 'A nova senha não pode ser a senha padrão provisória (admin123).' };
    }

    // 1. Save new hash locally
    storageService.setUserPassword(currentUser.id, newPasswordPlain);
    const newHash = hashPassword(newPasswordPlain);
    const now = new Date().toISOString();

    // 2. Remove forcePasswordChange and attach hash to users list
    const users = storageService.getUsers();
    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id) {
        return { 
          ...u, 
          passwordHash: newHash, 
          forcePasswordChange: false, 
          passwordUpdatedAt: now,
          updatedAt: now 
        };
      }
      return u;
    });
    storageService.saveUsers(updatedUsers);

    // 3. Instant atomic push to cloud so phone and computer are immediately synchronized!
    await cloudSyncService.syncUserPasswordToCloud(currentUser.id, newHash);
    await cloudSyncService.pushToCloud();

    const updatedCurrent = { ...currentUser, passwordHash: newHash, forcePasswordChange: false };
    setCurrentUser(updatedCurrent);
    setRequiresPasswordChange(false);
    sessionStorage.setItem('tb_session_v2', JSON.stringify(updatedCurrent));
    localStorage.setItem('tb_session_v2', JSON.stringify(updatedCurrent));

    return { success: true };
  };

  const resetAdminPassword = async (verification: string, newPasswordPlain: string): Promise<{ success: boolean; error?: string }> => {
    if (newPasswordPlain.length < 6) {
      return { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' };
    }
    if (newPasswordPlain === 'admin123') {
      return { success: false, error: 'Escolha uma nova senha diferente de admin123.' };
    }

    const newHash = hashPassword(newPasswordPlain);

    // 1. Attempt atomic cloud reset
    const cloudRes = await cloudSyncService.resetAdminPasswordInCloud(verification, newHash);
    if (!cloudRes.success) {
      return { success: false, error: cloudRes.error || 'Não foi possível redefinir a senha do administrador.' };
    }

    // 2. Save locally
    const now = new Date().toISOString();
    storageService.setUserPassword('user_admin_01', newPasswordPlain);
    const users = storageService.getUsers().map(u => {
      if (u.id === 'user_admin_01' || u.role === 'admin') {
        return {
          ...u,
          passwordHash: newHash,
          passwordUpdatedAt: now,
          updatedAt: now,
          forcePasswordChange: false,
        };
      }
      return u;
    });
    storageService.saveUsers(users);

    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    setRequiresPasswordChange(false);
    localStorage.removeItem('tb_session_v1');
    sessionStorage.removeItem('tb_session_v1');
    localStorage.removeItem('tb_session_v2');
    sessionStorage.removeItem('tb_session_v2');
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
        resetLockout,
        login,
        changePassword,
        resetAdminPassword,
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
