import { Router, type IRouter } from "express";
import healthRouter from "./health";
import domainsRouter from "./domains";
import emailsRouter from "./emails";

const router: IRouter = Router();

router.use(healthRouter);
router.use(domainsRouter);
router.use(emailsRouter);

export default router;
