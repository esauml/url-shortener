import { Router } from "express";

import { createUrlController } from "@/controllers/url.controller";
import { container } from "@/container";
import { config } from "@/config";

const router = Router();

const { shortenUrl, redirectUrl } = createUrlController(
    container.urlService,
    config.workerId
);

router.get('/:code', redirectUrl);
router.post('/', shortenUrl);

export default router;