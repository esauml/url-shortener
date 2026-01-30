import { Request, Response, NextFunction } from "express";
import { UrlService } from "../services/url.service";
import { ValidationError } from "../errors/AppError";

const workerId = process.env.WORKER_ID || process.env.HOSTNAME || '0';

export const shortenUrl = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { url } = req.body;

        if (!url || typeof url !== 'string') {
            throw new ValidationError("Invalid URL");
        }

        const shortUrl = await UrlService.createShortUrl(url);
        console.log(`[Worker ${workerId}] Generated code: ${shortUrl.code} for ${url}`);
        res.status(201).json({
            shortUrl: `${req.protocol}://${req.get("host")}/${shortUrl.code}`,
            shortCode: shortUrl.code,
            workerId: workerId
        });
    } catch (error) {
        next(error);
    }
};

export const redirectUrl = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code } = req.params;

        if (!code || typeof code !== 'string') {
            throw new ValidationError("Invalid code");
        }

        const originalUrl = await UrlService.getOriginalUrl(code);

        console.log(`[Worker ${workerId}] Redirecting ${code} -> ${originalUrl}`);
        res.redirect(302, originalUrl);
    } catch (error) {
        next(error);
    }
};

