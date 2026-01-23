import { Router } from "express";

import { shortenUrl, redirectUrl } from "../controllers/url.controller";

const router = Router();

router.post('/', shortenUrl);
router.get('/:code', redirectUrl);

export default router;