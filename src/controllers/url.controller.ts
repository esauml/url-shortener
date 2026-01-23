import { Request, Response } from "express";

export const shortenUrl = (req: Request, res: Response) => {
    //url body
    const { url } = req.body;
    // Logic to create a short URL
    res.status(201).send({ shortUrl: "http://short.url/abc123" });
}

export const redirectUrl = (req: Request, res: Response) => {
    const { code } = req.params;
    // Logic to redirect to the original URL
    res.redirect("http://localhost:3000/health");
}

