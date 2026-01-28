import { Request, Response } from "express";
import { UrlService } from "../services/url.service";

const workerId = process.env.WORKER_ID || process.env.HOSTNAME || '0';

export const shortenUrl = async (req: Request, res: Response) => {
    const { url } = req.body;

    // create short URL (generate code with snowflake, collision free)
    // store it in DB (Postgres + Redis cache, scalable DB needed)
    // return response code to user (only necessary data)

    try {
        const shortUrl = await UrlService.createShortUrl(url);
        console.log(`[Worker ${workerId}] Generated code: ${shortUrl.code} for ${url}`);
        res.status(201).json({
            shortUrl: `${req.protocol}://${req.get("host")}/${shortUrl.code}`,
            shortCode: shortUrl.code,
            workerId: workerId
        });
    } catch (err: any) {
        console.error(`[Worker ${workerId}] Error shortening URL:`, err.message);
        res.status(400).json({ message: err.message });
    }
};

export const redirectUrl = async (req: Request, res: Response) => {
    const { code } = req.params;

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: "Invalid code" });
    }

    const originalUrl = await UrlService.getOriginalUrl(code);

    if (!originalUrl) {
        return res.status(404).json({ message: "URL not found" });
    }

    console.log(`[Worker ${workerId}] Redirecting ${code} -> ${originalUrl}`);
    res.redirect(302, originalUrl);
};
