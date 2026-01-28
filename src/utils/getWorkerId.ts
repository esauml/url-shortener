import crypto from "crypto";

export function getWorkerId(): number {
    const hostname = require("os").hostname();
    const hash = crypto.createHash("md5").update(hostname).digest();
    return (hash[0] ?? 0) & 0b1111111111;
}

