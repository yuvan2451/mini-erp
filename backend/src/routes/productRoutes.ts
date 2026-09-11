import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import { allowRoles } from "../middleware/roleMiddleware";

import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  createStockMovement,
  getStockMovements,
  getLowStockProducts,
} from "../controllers/productController";

const router = Router();

// Create product
router.post(
  "/",
  authenticateToken,
  allowRoles("ADMIN", "WAREHOUSE"),
  createProduct
);

// Get all products
router.get(
  "/",
  authenticateToken,
  allowRoles("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"),
  getProducts
);

// Low-stock products
// IMPORTANT: this must come before /:id
router.get(
  "/low-stock",
  authenticateToken,
  allowRoles("ADMIN", "WAREHOUSE", "ACCOUNTS"),
  getLowStockProducts
);

// Get product by ID
router.get(
  "/:id",
  authenticateToken,
  allowRoles("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"),
  getProductById
);

// Update product
router.put(
  "/:id",
  authenticateToken,
  allowRoles("ADMIN", "WAREHOUSE"),
  updateProduct
);

// Add stock movement
router.post(
  "/:id/stock",
  authenticateToken,
  allowRoles("ADMIN", "WAREHOUSE"),
  createStockMovement
);

// Get stock movement history
router.get(
  "/:id/stock",
  authenticateToken,
  allowRoles("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"),
  getStockMovements
);

export default router;