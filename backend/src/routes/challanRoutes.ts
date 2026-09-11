import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { allowRoles } from "../middleware/roleMiddleware";

import {
  createChallan,
  getChallans,
  getChallanById,
  confirmChallan,
  cancelChallan,
} from "../controllers/challanController";

const router = Router();

// Create draft challan
router.post(
  "/",
  authenticateToken,
  allowRoles("ADMIN", "SALES"),
  createChallan
);

// List challans
router.get(
  "/",
  authenticateToken,
  allowRoles("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"),
  getChallans
);

// Get challan details
router.get(
  "/:id",
  authenticateToken,
  allowRoles("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"),
  getChallanById
);

// Confirm challan and reduce stock
router.post(
  "/:id/confirm",
  authenticateToken,
  allowRoles("ADMIN", "SALES", "WAREHOUSE"),
  confirmChallan
);

// Cancel challan and restore stock if already confirmed
router.post(
  "/:id/cancel",
  authenticateToken,
  allowRoles("ADMIN", "SALES", "WAREHOUSE"),
  cancelChallan
);

export default router;