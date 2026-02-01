import { Request, Response, NextFunction } from "express";
import { UrlService } from "@/services/url.service";
import { ValidationError } from "@/errors/AppError";

export const createUrlController = (urlService: UrlService, workerId: number) => {
    const shortenUrl = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { url } = req.body;

            if (!url || typeof url !== 'string') {
                throw new ValidationError("Invalid URL");
            }

            const shortUrl = await urlService.createShortUrl(url);

            // Use request-scoped logger from pino-http middleware (typed via Express augmentation)
            req.log.info({
                code: shortUrl.code,
                url,
                workerId,
            }, 'Generated short URL');

            res.status(201).json({
                shortUrl: `${req.protocol}://${req.get("host")}/${shortUrl.code}`,
                shortCode: shortUrl.code,
                workerId: workerId
            });
        } catch (error) {
            next(error);
        }
    };

    const redirectUrl = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { code } = req.params;

            if (!code || typeof code !== 'string') {
                throw new ValidationError("Invalid code");
            }

            const originalUrl = await urlService.getOriginalUrl(code);

            // Use request-scoped logger from pino-http middleware (typed via Express augmentation)
            req.log.info({
                code,
                originalUrl,
                workerId,
            }, 'Redirecting to original URL');

            res.redirect(302, originalUrl);
        } catch (error) {
            next(error);
        }
    };

    return { shortenUrl, redirectUrl };
};

