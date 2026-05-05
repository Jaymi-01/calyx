"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "../types";
import { api } from "../api";
import * as cryptoUtils from "../crypto";

interface AuthContextType {
  user: User | null;
  privateKey: CryptoKey | null;
  isLoading: boolean;
  login: (password: string, username: string) => Promise<void>;
  register: (password: string, username: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    const { access } = api.getTokens();
    
    if (!access) {
      // No token found, transition immediately to unauthenticated state
      setIsLoading(false);
      return;
    }

    try {
      // Token found, attempt to restore profile and keys
      const currentUser = await api.me();
      setUser(currentUser);
      
      const sessionWrappingKey = sessionStorage.getItem('wrapping_key');
      if (sessionWrappingKey) {
        const wrappingKey = await window.crypto.subtle.importKey(
          "raw",
          cryptoUtils.base64ToArrayBuffer(sessionWrappingKey),
          "AES-GCM",
          false,
          ["unwrapKey"]
        );
        const unwrapped = await cryptoUtils.unwrapPrivateKey(
          cryptoUtils.base64ToArrayBuffer(currentUser.wrapped_private_key),
          wrappingKey
        );
        setPrivateKey(unwrapped);
      }
    } catch (e) {
      console.error("Failed to restore session", e);
      api.clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (isMounted) {
        await restoreSession();
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [restoreSession]);

  const login = async (password: string, username: string) => {
    const res = await api.login({ username, password });
    setUser(res.user);

    // Derive wrapping key and unwrap private key
    const salt = cryptoUtils.base64ToArrayBuffer(res.user.pbkdf2_salt);
    const wrappingKey = await cryptoUtils.deriveWrappingKey(password, new Uint8Array(salt));
    const unwrapped = await cryptoUtils.unwrapPrivateKey(
      cryptoUtils.base64ToArrayBuffer(res.user.wrapped_private_key),
      wrappingKey
    );
    setPrivateKey(unwrapped);

    // Store wrapping key in sessionStorage for session persistence
    const exportedWrappingKey = await window.crypto.subtle.exportKey("raw", wrappingKey);
    sessionStorage.setItem('wrapping_key', cryptoUtils.arrayBufferToBase64(exportedWrappingKey));
  };

  const register = async (password: string, username: string, displayName: string) => {
    // 1. Generate keys
    const keyPair = await cryptoUtils.generateRSAKeyPair();
    const salt = cryptoUtils.generateSalt();
    
    // 2. Derive wrapping key
    const wrappingKey = await cryptoUtils.deriveWrappingKey(password, salt);
    
    // 3. Wrap private key
    const wrappedPrivateKey = await cryptoUtils.wrapPrivateKey(keyPair.privateKey, wrappingKey);
    
    // 4. Export public key
    const publicKeyBase64 = await cryptoUtils.exportPublicKey(keyPair.publicKey);
    
    // 5. Register
    const res = await api.register({
      username,
      display_name: displayName,
      password,
      public_key: publicKeyBase64,
      wrapped_private_key: cryptoUtils.arrayBufferToBase64(wrappedPrivateKey),
      pbkdf2_salt: cryptoUtils.arrayBufferToBase64(salt),
    });

    setUser(res.user);
    setPrivateKey(keyPair.privateKey);

    // Store wrapping key in sessionStorage
    const exportedWrappingKey = await window.crypto.subtle.exportKey("raw", wrappingKey);
    sessionStorage.setItem('wrapping_key', cryptoUtils.arrayBufferToBase64(exportedWrappingKey));
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setPrivateKey(null);
    sessionStorage.removeItem('wrapping_key');
  };

  return (
    <AuthContext.Provider value={{ user, privateKey, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
