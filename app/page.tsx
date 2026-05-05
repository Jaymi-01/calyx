"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useChat } from "@/lib/hooks/use-chat";
import { Sidebar } from "@/components/chat/sidebar";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { ShieldCheck } from "@phosphor-icons/react";
import AuthPage from "./auth/page";
import { cn } from "@/lib/utils";

export default function Home() {
  const { user, isLoading, privateKey, logout } = useAuth();
  const { activeRecipientId } = useChat();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0B141A] p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#202C33] border-t-[#005C4B]"></div>
          <p className="text-sm font-medium text-[#E9EDEF]/60">Initializing secure environment...</p>
        </div>
      </div>
    );
  }

  // If no user, show the Auth page directly
  if (!user) {
    return <AuthPage />;
  }

  // If user is logged in but private key is missing (e.g. session restored but no password entered)
  // We show a specialized screen to prompt for password/re-login
  if (!privateKey) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0B141A] p-8 text-center text-[#E9EDEF]">
        <div className="max-w-md space-y-6">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#202C33] text-[#53BDEB]">
            <ShieldCheck size={40} weight="bold" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Security Key Required</h2>
            <p className="text-sm text-[#E9EDEF]/60">
              Your session was restored, but your end-to-end encryption keys are still locked. 
              Please log in again to unwrap your keys and access your messages.
            </p>
          </div>
          <button
            onClick={() => logout()}
            className="w-full rounded-xl bg-[#005C4B] py-3 text-sm font-semibold text-[#E9EDEF] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Log Out & Re-authenticate
          </button>
        </div>
      </div>
    );
  }

  // Final secure chat interface
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0B141A] text-[#E9EDEF]">
      <div className={cn(
        "h-full transition-all duration-300 ease-in-out",
        activeRecipientId ? "hidden md:block md:w-80" : "w-full md:w-80"
      )}>
        <Sidebar />
      </div>
      <main className={cn(
        "flex-1 flex flex-col relative h-full transition-all duration-300 ease-in-out",
        activeRecipientId ? "flex" : "hidden md:flex"
      )}>
        <MessageList />
        <MessageInput />
      </main>
    </div>
  );
}
