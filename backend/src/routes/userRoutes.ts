import { Router } from "express";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "../middleware/authMiddleware";
import { allowRoles } from "../middleware/roleMiddleware";

const router = Router();

router.get(
  "/me",
  authenticateToken,
  (req: AuthenticatedRequest, res) => {
    res.json({
      message: "Authenticated successfully",
      user: req.user,
    });
  }
);

router.get(
  "/admin-test",
  authenticateToken,
  allowRoles("ADMIN"),
  (_req, res) => {
    res.json({
      message: "Admin access granted",
    });
  }
);

export default router;