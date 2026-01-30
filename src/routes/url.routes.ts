import { Router } from "express";

import { shortenUrl, redirectUrl } from "../controllers/url.controller";

const router = Router();

router.get('/:code', redirectUrl);
router.post('/', shortenUrl);

export default router;