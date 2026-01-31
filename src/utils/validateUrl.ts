export const isValidUrl = (url: string): boolean => {
    try {
        const parsedUrl = new URL(url);
        const validProtocols = ['http:', 'https:', 'ftp:', 'file:'];
        if (!validProtocols.includes(parsedUrl.protocol)) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
};
