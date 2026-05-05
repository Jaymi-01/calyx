# Calyx

Calyx is a secure, end-to-end encrypted (E2EE) messaging application. It ensures that your private conversations stay private — not even the server can read your messages.

## Features

- **End-to-End Encryption:** All messages are encrypted on the sender's device and decrypted only on the recipient's device.
- **Hybrid Cryptography:** 
    - **RSA-OAEP (2048-bit):** Used for secure key exchange.
    - **AES-GCM (256-bit):** Used for fast and secure symmetric message encryption.
    - **PBKDF2 & AES-GCM:** Used to securely wrap your private keys with your password so they can be safely stored (encrypted) on the server.
- **Real-time Messaging:** Powered by WebSockets for instant message delivery and presence updates.
- **Secure Key Management:** Your private keys never leave your device in plaintext. They are unwrapped in memory only when you are logged in.
- **Modern UI:** A clean, responsive interface built with Next.js, Tailwind CSS, and Phosphor Icons.

## Technical Architecture

### Encryption Flow

1. **Registration:**
   - Client generates an RSA-OAEP keypair.
   - Client derives a wrapping key from the user's password using PBKDF2.
   - Private key is wrapped (encrypted) with AES-GCM and sent to the server along with the public key.
2. **Login:**
   - Client fetches the wrapped private key and salt.
   - Client re-derives the wrapping key and unwraps the private key into memory.
3. **Messaging:**
   - Sender fetches the recipient's public key.
   - Sender generates a random AES-GCM key and IV.
   - Sender encrypts the message with the AES key.
   - Sender encrypts the AES key with both the recipient's and their own public key.
   - All encrypted blobs are sent to the server.
4. **Decryption:**
   - Recipient uses their private key to decrypt the AES key.
   - Recipient uses the AES key to decrypt the message content.

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Security

- Raw private keys are never stored in localStorage or sent to the server.
- Encryption/Decryption happens exclusively on the client side using the Web Crypto API.
- Secure session management with JWT (access and refresh tokens).
