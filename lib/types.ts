export interface User {
  id: string;
  username: string;
  display_name: string;
  public_key: string;
  wrapped_private_key: string;
  pbkdf2_salt: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface MessagePayload {
  ciphertext: string;
  iv: string;
  encryptedKey: string;
  encryptedKeyForSelf: string;
  type?: 'text' | 'image';
  mime_type?: string;
}

export interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  payload: MessagePayload;
  delivered: boolean;
  created_at: string;
}

export interface Conversation {
  user_id: string;
  display_name: string;
  username: string;
  last_message_at: string;
}

export interface SearchResult {
  id: string;
  username: string;
  display_name: string;
}

export type WSClientEvent = 
  | { event: 'message.send'; to: string; payload: MessagePayload };

export type WSServerEvent = 
  | { event: 'message.receive' } & Message
  | { event: 'user.online'; user_id: string }
  | { event: 'user.offline'; user_id: string }
  | { event: 'error'; detail: string };
