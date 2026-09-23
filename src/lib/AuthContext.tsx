import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, UserRole } from '../types';
import { db } from './firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { hashPassword } from './utils';
import { seedInitialDatabaseIfEmpty, INITIAL_PRESET_USERS } from './seed';

interface AuthContextType {
  currentUser: UserAccount | null;
  isLoading: boolean;
  login: (username: string, passwordPlain: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchUserQuickDemo: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'klb_session_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Run seed on first boot if DB empty
    seedInitialDatabaseIfEmpty().finally(() => {
      // Restore session
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as UserAccount;
          // Refresh user data from firestore
          getDoc(doc(db, 'users', parsed.id)).then((snap) => {
            if (snap.exists()) {
              const fresh = snap.data() as UserAccount;
              if (fresh.status === 'ACTIVE') {
                setCurrentUser(fresh);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
              } else {
                localStorage.removeItem(STORAGE_KEY);
                setCurrentUser(null);
              }
            } else {
              setCurrentUser(parsed);
            }
          }).catch(() => {
            setCurrentUser(parsed);
          }).finally(() => {
            setIsLoading(false);
          });
        } catch {
          localStorage.removeItem(STORAGE_KEY);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  const login = async (username: string, passwordPlain: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const cleanUsername = username.trim().toLowerCase();
      if (!cleanUsername || !passwordPlain) {
        return { success: false, message: 'Username dan kata sandi wajib diisi.' };
      }

      // Check preset users as immediate fallback if offline or remote Firestore rule syncing
      const preset = INITIAL_PRESET_USERS.find((u) => u.username.toLowerCase() === cleanUsername);

      // Try Firestore first
      try {
        const q = query(collection(db, 'users'), where('username', '==', cleanUsername));
        const querySnap = await getDocs(q);

        if (!querySnap.empty) {
          const userDoc = querySnap.docs[0];
          const userData = userDoc.data() as UserAccount;

          // Status check
          if (userData.status === 'LOCKED') {
            return {
              success: false,
              message: 'Akun Anda terkunci karena alasan keamanan atau terlalu banyak percobaan gagal. Hubungi Administrator.',
            };
          }
          if (userData.status === 'SUSPENDED') {
            return {
              success: false,
              message: 'Akun Anda sedang ditangguhkan (SUSPENDED). Hubungi Administrator.',
            };
          }
          if (userData.status === 'INACTIVE') {
            return {
              success: false,
              message: 'Akun ini telah dinonaktifkan (INACTIVE). Anda tidak memiliki izin akses sistem.',
            };
          }

          const inputHash = await hashPassword(passwordPlain);

          if (userData.passwordHash && userData.passwordHash !== inputHash) {
            const newFailed = (userData.failedAttempts || 0) + 1;
            const willLock = newFailed >= 5;
            try {
              await updateDoc(doc(db, 'users', userDoc.id), {
                failedAttempts: newFailed,
                status: willLock ? 'LOCKED' : userData.status,
              });
            } catch {}

            if (willLock) {
              return {
                success: false,
                message: 'Akun Anda telah TERKUNCI (LOCKED) karena 5x gagal login berturut-turut. Hubungi Super Admin.',
              };
            }

            return {
              success: false,
              message: `Password salah! Percobaan gagal: ${newFailed}/5.`,
            };
          }

          const now = new Date().toISOString();
          const updatedUser: UserAccount = {
            ...userData,
            failedAttempts: 0,
            lastLoginAt: now,
          };

          try {
            await updateDoc(doc(db, 'users', userDoc.id), {
              failedAttempts: 0,
              lastLoginAt: now,
            });
          } catch {}

          setCurrentUser(updatedUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
          return { success: true };
        }
      } catch (firestoreErr) {
        console.warn('Firestore query fallback to preset user:', firestoreErr);
      }

      // If user is in default preset list and entered valid password (password123)
      if (preset) {
        if (passwordPlain === 'password123') {
          const authenticatedUser: UserAccount = {
            ...preset,
            lastLoginAt: new Date().toISOString(),
          };
          setCurrentUser(authenticatedUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser));
          return { success: true };
        } else {
          return { success: false, message: 'Password salah! Default kata sandi adalah: password123' };
        }
      }

      return { success: false, message: 'Kombinasi Username dan Password tidak ditemukan.' };
    } catch (err: any) {
      console.error('Login error:', err);
      return { success: false, message: 'Terjadi kesalahan sistem saat mencoba masuk. Silakan coba lagi.' };
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
  };

  // Quick switch for development / testing each persona seamlessly
  const switchUserQuickDemo = async (username: string) => {
    try {
      const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const u = snap.docs[0].data() as UserAccount;
        setCurrentUser(u);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        return;
      }
    } catch (e) {
      console.warn('Switch fallback to presets');
    }

    const preset = INITIAL_PRESET_USERS.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (preset) {
      setCurrentUser(preset);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preset));
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, switchUserQuickDemo }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
