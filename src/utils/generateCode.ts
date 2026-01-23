import crypto from "crypto";

export const generateCode = (length = 6): string => {
    return crypto.randomBytes(length)
        .toString("base64url")
        .slice(0, length);
};
