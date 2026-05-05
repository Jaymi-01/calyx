"use client";

import React from "react";
import { useChat } from "@/lib/hooks/use-chat";
import { useAuth } from "@/lib/hooks/use-auth";
import { UserSearch } from "./user-search";
import { User, SignOut, ChatCircleDots } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { conversations, activeRecipientId, setActiveRecipientId } = useChat();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full w-80 flex-col border-r border-[#202C33] bg-[#0B141A] z-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#202C33] p-6 bg-[#202C33]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#005C4B] text-[#E9EDEF] shadow-lg">
            <User size={20} weight="bold" />
          </div>
          <div className="overflow-hidden">
            <div className="truncate text-sm font-bold text-[#E9EDEF]">
              {user?.display_name}
            </div>
            <div className="truncate text-[10px] uppercase tracking-wider text-[#E9EDEF]/60 font-medium">@{user?.username}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="rounded-xl p-2.5 text-[#E9EDEF]/60 hover:bg-[#0B141A] hover:text-[#53BDEB] transition-all border border-transparent hover:border-[#202C33]"
          title="Logout"
        >
          <SignOut size={20} weight="bold" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 bg-[#0B141A]">
        <UserSearch />
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto p-3 bg-[#0B141A]">
        <div className="flex items-center justify-between mb-4 px-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#E9EDEF]/40">
            Chats
          </h3>
          {conversations.length > 0 && (
            <span className="bg-[#005C4B] text-[#E9EDEF] text-[10px] px-2 py-0.5 rounded-full font-bold">
              {conversations.length}
            </span>
          )}
        </div>
        <div className="space-y-2">
          {conversations.length > 0 ? (
            conversations.map((conv) => (
              <button
                key={conv.user_id}
                onClick={() => setActiveRecipientId(conv.user_id)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-2xl px-3 py-3.5 text-left transition-all duration-200",
                  activeRecipientId === conv.user_id
                    ? "bg-[#202C33] text-[#E9EDEF] shadow-md"
                    : "text-[#E9EDEF]/60 hover:bg-[#202C33]/50"
                )}
              >
                <div className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 shadow-sm",
                  activeRecipientId === conv.user_id 
                    ? "bg-[#005C4B] text-[#E9EDEF] border-transparent scale-105" 
                    : "bg-[#202C33] border-[#202C33] text-[#E9EDEF]/40"
                )}>
                  <ChatCircleDots size={24} weight={activeRecipientId === conv.user_id ? "fill" : "regular"} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-bold">
                      {conv.display_name}
                    </span>
                    <span className="text-[10px] text-[#E9EDEF]/40 font-medium">
                      {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="truncate text-xs text-[#E9EDEF]/40 mt-0.5 font-medium">
                    @{conv.username}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="mt-12 px-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#202C33] mx-auto mb-4 text-[#E9EDEF]/20">
                <ChatCircleDots size={32} />
              </div>
              <p className="text-sm font-bold text-[#E9EDEF]/40">No conversations</p>
              <p className="mt-1 text-xs text-[#E9EDEF]/20">Search for users to start</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
