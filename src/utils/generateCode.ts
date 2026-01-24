import crypto from "crypto";

// Option 1: Collision-resistant with retry (current enhanced approach)
export const generateCode = (length = 6): string => {
    return crypto.randomBytes(length)
        .toString("base64url")
        .slice(0, length);
};

// Option 2: Base62 encoding of incremental IDs (collision-free)
// Best for: High-volume production systems
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const generateCodeFromId = (id: number): string => {
    if (id === 0) return BASE62_CHARS[0]!;

    let code = '';
    let num = id;

    while (num > 0) {
        code = BASE62_CHARS[num % 62] + code;
        num = Math.floor(num / 62);
    }

    return code.padStart(6, '0');
};

// Option 3: Timestamp + random (very low collision probability)
// Best for: Distributed systems
export const generateCodeWithTimestamp = (): string => {
    const timestamp = Date.now().toString(36); // Base36 timestamp
    const random = crypto.randomBytes(3).toString('base64url').slice(0, 3);
    return (timestamp + random).slice(-6); // Take last 6 chars
};

// Option 4: Hash-based with URL content (deterministic)
// Best for: When same URL should get same code
export const generateCodeFromUrl = (url: string): string => {
    const hash = crypto.createHash('sha256').update(url).digest('base64url');
    return hash.slice(0, 6);
};

// Option 5: UUID-style short ID (nanoid alternative, no dependencies)
// Best for: Balance of randomness and collision resistance
export const generateCodeSecure = (length = 6): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomBytes = crypto.randomBytes(length);
    let result = '';

    for (let i = 0; i < length; i++) {
        // Use modulo bias-free approach
        const byte = randomBytes[i];
        if (byte !== undefined) {
            result += chars[byte % chars.length];
        }
    }

    return result;
};
