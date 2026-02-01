/**
 * List of allowed URL protocols for security and compatibility
 * - http/https: Standard web protocols
 * - ftp: File transfer protocol
 */
export const VALID_URL_PROTOCOLS = ['http:', 'https:', 'ftp:'] as const;

export const isValidUrl = (url: string): boolean => {
    try {
        const parsedUrl = new URL(url);
        if (!VALID_URL_PROTOCOLS.includes(parsedUrl.protocol as any)) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
};
