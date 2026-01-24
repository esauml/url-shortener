import { Request, Response } from "express";
import { UrlService } from "../services/url.service";

export const shortenUrl = async (req: Request, res: Response) => {
    const { url } = req.body;

    try {
        const shortUrl = await UrlService.createShortUrl(url);
        res.status(201).json({
            shortUrl: `${req.protocol}://${req.get("host")}/${shortUrl.code}`
        });
    } catch (err: any) {
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

    res.redirect(302, originalUrl);
};
