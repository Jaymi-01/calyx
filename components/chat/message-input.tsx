"use client";

import React, { useState, useRef } from "react";
import { useChat } from "@/lib/hooks/use-chat";
import { PaperPlaneRight, LockKey, Image as ImageIcon } from "@phosphor-icons/react";

export function MessageInput() {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { sendMessage, sendImage, activeRecipientId } = useChat();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!activeRecipientId) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(content.trim());
      setContent("");
    } catch (e) {
      console.error("Failed to send", e);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isSending) return;

    setIsSending(true);
    try {
      await sendImage(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      console.error("Failed to send image", e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="border-t border-[#202C33] bg-[#202C33] p-4 z-10">
      <form onSubmit={handleSend} className="mx-auto max-w-4xl relative flex items-center gap-3">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <button
          type="button"
          disabled={isSending}
          onClick={() => fileInputRef.current?.click()}
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-[#E9EDEF]/60 hover:bg-[#0B141A] hover:text-[#53BDEB] transition-all disabled:opacity-50"
          title="Send Image"
        >
          <ImageIcon size={24} weight="bold" />
        </button>
        <div className="flex-1 relative group">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a secure message..."
            className="w-full rounded-2xl border border-[#0B141A] bg-[#202C33] py-3.5 pl-5 pr-12 text-sm text-[#E9EDEF] placeholder-[#E9EDEF]/40 transition-all focus:border-[#53BDEB] focus:outline-none focus:ring-4 focus:ring-[#53BDEB]/5"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#53BDEB] transition-transform group-focus-within:scale-110" title="End-to-End Encrypted">
            <LockKey size={20} weight="fill" />
          </div>
        </div>
        <button
          type="submit"
          disabled={!content.trim() || isSending}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#005C4B] text-[#E9EDEF] shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
        >
          {isSending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#E9EDEF]/30 border-t-[#E9EDEF]" />
          ) : (
            <PaperPlaneRight size={22} weight="bold" />
          )}
        </button>
      </form>
    </div>
  );
}
