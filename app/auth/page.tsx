"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Lock, User, IdentificationCard } from "@phosphor-icons/react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(password, username);
      } else {
        await register(password, username, displayName);
      }
      // No need to redirect, Home component will switch to chat view automatically via state
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B141A] p-4 font-sans text-[#E9EDEF]">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-[#202C33] p-8 shadow-xl border border-[#202C33]">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#005C4B] text-[#E9EDEF] mb-4">
            <Lock size={32} weight="bold" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[#E9EDEF]">
            {isLogin ? "Welcome back" : "Create an account"}
          </h2>
          <p className="mt-2 text-sm text-[#E9EDEF]/60">
            {isLogin
              ? "Sign in to your secure messaging account"
              : "Join Calyx and start messaging securely"}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-900/20 p-4 text-sm text-red-400 border border-red-900/40">
              {error}
            </div>
          )}

          <div className="space-y-4 rounded-md shadow-sm">
            {!isLogin && (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#E9EDEF]/40">
                  <IdentificationCard size={20} />
                </div>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="block w-full rounded-lg border border-[#0B141A] bg-[#0B141A] py-3 pl-10 pr-3 text-[#E9EDEF] placeholder-[#E9EDEF]/40 focus:border-[#53BDEB] focus:outline-none focus:ring-1 focus:ring-[#53BDEB] sm:text-sm"
                  placeholder="Display Name"
                />
              </div>
            )}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#E9EDEF]/40">
                <User size={20} />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full rounded-lg border border-[#0B141A] bg-[#0B141A] py-3 pl-10 pr-3 text-[#E9EDEF] placeholder-[#E9EDEF]/40 focus:border-[#53BDEB] focus:outline-none focus:ring-1 focus:ring-[#53BDEB] sm:text-sm"
                placeholder="Username"
              />
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#E9EDEF]/40">
                <Lock size={20} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border border-[#0B141A] bg-[#0B141A] py-3 pl-10 pr-3 text-[#E9EDEF] placeholder-[#E9EDEF]/40 focus:border-[#53BDEB] focus:outline-none focus:ring-1 focus:ring-[#53BDEB] sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-lg bg-[#005C4B] text-[#E9EDEF] text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? "Processing..." : isLogin ? "Sign In" : "Register"}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-medium text-[#E9EDEF]/60 hover:text-[#53BDEB]"
            >
              {isLogin
                ? "Don't have an account? Register"
                : "Already have an account? Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
