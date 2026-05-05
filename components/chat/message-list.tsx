"use client";

import React, { useEffect, useRef } from "react";
import { useChat } from "@/lib/hooks/use-chat";
import { useAuth } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils";
import { ShieldCheck, Clock, Checks } from "@phosphor-icons/react";

export function MessageList() {
  const { messages, decryptedMessages, activeRecipientId, conversations } = useChat();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.user_id === activeRecipientId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, decryptedMessages]);

  if (!activeRecipientId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#0B141A] text-center p-8">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#202C33] shadow-sm border border-[#202C33]">
          <ShieldCheck size={48} className="text-[#E9EDEF]/20" />
        </div>
        <h2 className="text-xl font-semibold text-[#E9EDEF]">End-to-End Encrypted</h2>
        <p className="mt-2 max-w-sm text-sm text-[#E9EDEF]/60">
          Your messages are secured with RSA-OAEP and AES-GCM. 
          Only you and the recipient can read them.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-[#0B141A] overflow-hidden relative">
      {/* Chat Header */}
      <div className="flex items-center gap-3 border-b border-[#202C33] px-6 py-4 bg-[#202C33] z-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B141A] text-[#53BDEB]">
          <ShieldCheck size={24} weight="bold" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#E9EDEF]">
            {activeConv?.display_name || "New Chat"}
          </h2>
          <p className="text-[10px] flex items-center gap-1 text-[#53BDEB] font-medium uppercase tracking-wider">
            <ShieldCheck size={12} weight="fill" />
            End-to-end encrypted
          </p>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 doodle-bg"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-20 text-[#E9EDEF]">
            <Clock size={32} className="mb-2" />
            <p className="text-sm">No messages yet. Send a secure message to start.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.from_user_id === user?.id;
            const content = decryptedMessages[msg.id];

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex w-full flex-col animate-in fade-in slide-in-from-bottom-2 duration-300",
                  isMe ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-md transition-all hover:shadow-lg relative overflow-hidden",
                    isMe
                      ? "bg-[#005C4B] text-[#E9EDEF] rounded-tr-none"
                      : "bg-[#202C33] text-[#E9EDEF] rounded-tl-none border border-[#202C33]"
                  )}
                >
                  {content === undefined ? (
                    <span className="italic opacity-50 animate-pulse">Decrypting...</span>
                  ) : msg.payload.type === 'image' ? (
                    <div className="flex flex-col gap-2">
                      <img 
                        src={content} 
                        alt="Shared image" 
                        className="rounded-lg max-h-64 object-contain bg-black/20"
                      />
                      {isMe && (
                        <div className={cn(
                          "flex self-end transition-colors",
                          msg.delivered ? "text-[#53BDEB]" : "text-[#E9EDEF]/20"
                        )}>
                          <Checks size={16} weight="bold" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <span>{content}</span>
                      {isMe && (
                        <div className={cn(
                          "flex mb-0.5 transition-colors",
                          msg.delivered ? "text-[#53BDEB]" : "text-[#E9EDEF]/20"
                        )}>
                          <Checks size={16} weight="bold" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <span className="mt-1 px-1 text-[10px] text-[#E9EDEF]/40">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
