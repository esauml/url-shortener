import { ShortUrl } from "../types/url";

const urls = new Map<string, ShortUrl>();
let currentId = 0; // In production, use database auto-increment

export const UrlRepository = {
    save(data: ShortUrl) {
        urls.set(data.code, data);
        return data;
    },

    findByCode(code: string) {
        return urls.get(code);
    },

    getNextId(): number {
        return ++currentId;
    }
};
