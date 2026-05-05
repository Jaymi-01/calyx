import { AuthResponse, Conversation, Message, SearchResult, User } from "./types";

const BASE_URL = "https://whisperbox.koyeb.app";

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  getTokens() {
    if (typeof window !== 'undefined' && this.accessToken === null) {
      try {
        const access = localStorage.getItem('access_token');
        const refresh = localStorage.getItem('refresh_token');
        
        // Filter out falsy or stringified junk values
        this.accessToken = access && access !== 'null' && access !== 'undefined' ? access : null;
        this.refreshToken = refresh && refresh !== 'null' && refresh !== 'undefined' ? refresh : null;
      } catch (e) {
        console.error("Failed to read tokens from localStorage", e);
      }
    }
    return { access: this.accessToken, refresh: this.refreshToken };
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const { access } = this.getTokens();
    
    const headers = new Headers(options.headers);
    if (access && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${access}`);
    }

    // Add a 30-second timeout to fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 401 && this.refreshToken && path !== '/auth/refresh') {
        // Try to refresh token
        try {
          const refreshData = await this.refreshTokens(this.refreshToken);
          this.setTokens(refreshData.access_token, this.refreshToken);
          
          // Retry request
          headers.set('Authorization', `Bearer ${refreshData.access_token}`);
          const retryResponse = await fetch(`${BASE_URL}${path}`, {
            ...options,
            headers,
          });
          if (!retryResponse.ok) throw new Error(await retryResponse.text());
          return await retryResponse.json();
        } catch (e) {
          this.clearTokens();
          throw e;
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Request failed with status ${response.status}`);
      }

      if (response.status === 204) return {} as T;
      return await response.json();
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        throw new Error("Request timed out. The server might be waking up or your connection is slow.");
      }
      throw e;
    }
  }

  async register(data: {
    username: string;
    display_name: string;
    password: string;
    public_key: string;
    wrapped_private_key: string;
    pbkdf2_salt: string;
  }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    this.setTokens(res.access_token, res.refresh_token);
    return res;
  }

  async login(data: Record<string, string>): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    this.setTokens(res.access_token, res.refresh_token);
    return res;
  }

  async me(): Promise<User> {
    return await this.request<User>("/auth/me");
  }

  async refreshTokens(refreshToken: string): Promise<{ access_token: string }> {
    return await this.request<{ access_token: string }>("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async logout() {
    const { refresh } = this.getTokens();
    if (refresh) {
      await this.request("/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
    }
    this.clearTokens();
  }

  async searchUsers(query: string): Promise<SearchResult[]> {
    return await this.request<SearchResult[]>(`/users/search?q=${encodeURIComponent(query)}`);
  }

  async getPublicKey(userId: string): Promise<{ public_key: string }> {
    return await this.request<{ public_key: string }>(`/users/${userId}/public-key`);
  }

  async getConversations(): Promise<Conversation[]> {
    return await this.request<Conversation[]>("/conversations");
  }

  async getMessages(userId: string, limit = 50, before?: string): Promise<Message[]> {
    let url = `/conversations/${userId}/messages?limit=${limit}`;
    if (before) url += `&before=${encodeURIComponent(before)}`;
    return await this.request<Message[]>(url);
  }

  async sendMessage(to: string, payload: Record<string, string>): Promise<Message> {
    return await this.request<Message>("/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, payload }),
    });
  }
}

export const api = new ApiClient();
