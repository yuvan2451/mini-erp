import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { allowRoles } from "../middleware/roleMiddleware";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  addFollowUp,
  getFollowUps,
} from "../controllers/customerController";

const router = Router();

// Create customer
router.post(
  "/",
  authenticateToken,
  allowRoles("ADMIN", "SALES"),
  createCustomer
);

// Get all customers
router.get(
  "/",
  authenticateToken,
  allowRoles("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"),
  getCustomers
);

// Get customer by ID
router.get(
  "/:id",
  authenticateToken,
  allowRoles("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"),
  getCustomerById
);

// Add follow-up
router.post(
  "/:id/follow-ups",
  authenticateToken,
  allowRoles("ADMIN", "SALES"),
  addFollowUp
);

// Get follow-up history
router.get(
  "/:id/follow-ups",
  authenticateToken,
  allowRoles("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"),
  getFollowUps
);

export default router;