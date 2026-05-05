"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Conversation, Message, WSServerEvent } from "../types";
import { api } from "../api";
import { useAuth } from "./use-auth";
import * as cryptoUtils from "../crypto";

interface ChatContextType {
  conversations: Conversation[];
  messages: Message[];
  activeRecipientId: string | null;
  setActiveRecipientId: (id: string | null) => void;
  sendMessage: (content: string) => Promise<void>;
  sendImage: (file: File) => Promise<void>;
  decryptedMessages: Record<string, string>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, privateKey } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeRecipientId, setActiveRecipientId] = useState<string | null>(null);
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
  const socketRef = useRef<WebSocket | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (e) {
      console.error("Failed to fetch conversations", e);
    }
  }, [user]);

  const fetchMessages = useCallback(async (recipientId: string) => {
    if (!user) return;
    try {
      const data = await api.getMessages(recipientId);
      setMessages(data.reverse()); // Store in chronological order
    } catch (e) {
      console.error("Failed to fetch messages", e);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (user && isMounted) {
        await fetchConversations();
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [user, fetchConversations]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (activeRecipientId && isMounted) {
        await fetchMessages(activeRecipientId);
      } else if (isMounted) {
        setMessages([]);
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [activeRecipientId, fetchMessages]);

  const userId = user?.id;
  const decryptMessage = useCallback(async (message: Message) => {
    if (!privateKey || !userId) return;
    try {
      const isSender = message.from_user_id === userId;
      const payload = {
        ciphertext: message.payload.ciphertext,
        iv: message.payload.iv,
        encryptedKey: isSender ? message.payload.encryptedKeyForSelf : message.payload.encryptedKey
      };

      const decryptedBinary = await cryptoUtils.decryptBinary(payload, privateKey);

      // Sniff for image magic numbers
      const isPNG = decryptedBinary[0] === 0x89 && decryptedBinary[1] === 0x50 && decryptedBinary[2] === 0x4E && decryptedBinary[3] === 0x47;
      const isJPEG = decryptedBinary[0] === 0xFF && decryptedBinary[1] === 0xD8 && decryptedBinary[2] === 0xFF;
      const isGIF = decryptedBinary[0] === 0x47 && decryptedBinary[1] === 0x49 && decryptedBinary[2] === 0x46;
      const isWebP = decryptedBinary[8] === 0x57 && decryptedBinary[9] === 0x45 && decryptedBinary[10] === 0x42 && decryptedBinary[11] === 0x50;

      if (message.payload.type === 'image' || isPNG || isJPEG || isGIF || isWebP) {
        let mimeType = message.payload.mime_type;
        if (!mimeType) {
          if (isPNG) mimeType = 'image/png';
          else if (isJPEG) mimeType = 'image/jpeg';
          else if (isGIF) mimeType = 'image/gif';
          else if (isWebP) mimeType = 'image/webp';
          else mimeType = 'image/jpeg';
        }

        const blob = new Blob([decryptedBinary], { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          setDecryptedMessages(prev => ({ ...prev, [message.id]: reader.result as string }));
        };
        reader.readAsDataURL(blob);
      } else {
        const plaintext = new TextDecoder().decode(decryptedBinary);
        setDecryptedMessages(prev => ({ ...prev, [message.id]: plaintext }));
      }
    } catch (e) {
      console.error("Failed to decrypt message", e);
      setDecryptedMessages(prev => ({ ...prev, [message.id]: "[Failed to decrypt]" }));
    }
  }, [privateKey, userId]);

  useEffect(() => {
    messages.forEach(msg => {
      if (!decryptedMessages[msg.id]) {
        decryptMessage(msg);
      }
    });
  }, [messages, decryptedMessages, decryptMessage]);

  useEffect(() => {
    if (!user) return;

    const { access } = api.getTokens();
    if (!access) return;

    const wsUrl = `wss://whisperbox.koyeb.app/ws?token=${access}`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const data: WSServerEvent = JSON.parse(event.data);
      if (data.event === "message.receive") {
        const newMessage: Message = {
          id: data.id,
          from_user_id: data.from_user_id,
          to_user_id: data.to_user_id,
          payload: data.payload,
          delivered: data.delivered,
          created_at: data.created_at,
        };

        if (newMessage.from_user_id === activeRecipientId || newMessage.to_user_id === activeRecipientId) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
        
        // Refresh conversations to update last message
        fetchConversations();
      }
    };

    socket.onclose = () => {
      console.log("WebSocket closed");
    };

    return () => {
      socket.close();
    };
  }, [user, activeRecipientId, fetchConversations]);

  const sendMessage = async (content: string) => {
    if (!user || !activeRecipientId || !privateKey) return;

    try {
      // 1. Get recipient public key
      const { public_key: recipientPubKeyBase64 } = await api.getPublicKey(activeRecipientId);
      const recipientPubKey = await cryptoUtils.importPublicKey(recipientPubKeyBase64);
      
      // 2. Get sender (own) public key
      const senderPubKey = await cryptoUtils.importPublicKey(user.public_key);

      // 3. Encrypt message
      const encryptedPayload = await cryptoUtils.encryptMessage(content, recipientPubKey, senderPubKey);
      
      // 4. Add type
      const finalPayload = { ...encryptedPayload, type: 'text' as const };

      // 5. Send via API
      const newMessage = await api.sendMessage(activeRecipientId, finalPayload);
      
      setMessages(prev => {
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      
      fetchConversations();
    } catch (e) {
      console.error("Failed to send message", e);
      throw e;
    }
  };

  const sendImage = async (file: File) => {
    if (!user || !activeRecipientId || !privateKey) return;

    try {
      // 1. Get recipient public key
      const { public_key: recipientPubKeyBase64 } = await api.getPublicKey(activeRecipientId);
      const recipientPubKey = await cryptoUtils.importPublicKey(recipientPubKeyBase64);
      
      // 2. Get sender (own) public key
      const senderPubKey = await cryptoUtils.importPublicKey(user.public_key);

      // 3. Read file as ArrayBuffer
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);

      // 4. Encrypt image data
      const encryptedPayload = await cryptoUtils.encryptBinary(uint8, recipientPubKey, senderPubKey);

      // 5. Add type and mime_type
      const finalPayload = { 
        ...encryptedPayload, 
        type: 'image' as const,
        mime_type: file.type 
      };

      // 6. Send via API
      const newMessage = await api.sendMessage(activeRecipientId, finalPayload);
      
      setMessages(prev => {
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      
      fetchConversations();
    } catch (e) {
      console.error("Failed to send image", e);
      throw e;
    }
  };

  return (
    <ChatContext.Provider value={{ 
      conversations, 
      messages, 
      activeRecipientId, 
      setActiveRecipientId, 
      sendMessage,
      sendImage,
      decryptedMessages
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
