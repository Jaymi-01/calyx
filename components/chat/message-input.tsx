"use client";

import React, { useState } from "react";
import { useChat } from "@/lib/hooks/use-chat";
import { PaperPlaneRight, LockKey, Image as ImageIcon, X } from "@phosphor-icons/react";

export function MessageInput() {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { sendMessage, activeRecipientId } = useChat();

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

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#202C33] rounded-2xl p-6 shadow-2xl border border-[#0B141A] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-[#E9EDEF]">Not Working</h3>
              <button onClick={() => setShowModal(false)} className="text-[#E9EDEF]/40 hover:text-[#E9EDEF]">
                <X size={20} weight="bold" />
              </button>
            </div>
            <p className="text-[#E9EDEF]/80 leading-relaxed">
              This button is a fraud, like the owner of the code.
            </p>
            <button 
              onClick={() => setShowModal(false)}
              className="mt-6 w-full py-3 bg-[#005C4B] text-[#E9EDEF] rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-[#202C33] bg-[#202C33] p-4 z-10 w-full overflow-hidden">
        <form onSubmit={handleSend} className="mx-auto max-w-4xl flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl text-[#E9EDEF]/60 hover:bg-[#0B141A] hover:text-[#53BDEB] transition-all"
            title="Send Image"
          >
            <ImageIcon size={24} weight="bold" />
          </button>
          <div className="flex-1 relative group min-w-0">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type a secure message..."
              className="w-full rounded-2xl border border-[#0B141A] bg-[#202C33] py-3.5 pl-5 pr-12 text-sm text-[#E9EDEF] placeholder-[#E9EDEF]/40 transition-all focus:border-[#53BDEB] focus:outline-none focus:ring-4 focus:ring-[#53BDEB]/5"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#53BDEB] transition-transform group-focus-within:scale-110 pointer-events-none" title="End-to-End Encrypted">
              <LockKey size={20} weight="fill" />
            </div>
          </div>
          <button
            type="submit"
            disabled={!content.trim() || isSending}
            className="shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#005C4B] text-[#E9EDEF] shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isSending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#E9EDEF]/30 border-t-[#E9EDEF]" />
            ) : (
              <PaperPlaneRight size={22} weight="bold" />
            )}
          </button>
        </form>
      </div>
    </>
  );
}
