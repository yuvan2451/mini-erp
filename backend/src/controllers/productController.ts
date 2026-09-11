import { Response } from "express";
import { pool } from "../config/database";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

export async function createProduct(
  req: AuthenticatedRequest,
  res: Response
) {
  const client = await pool.connect();

  try {
    const {
      productName,
      sku,
      category,
      unitPrice,
      initialStock = 0,
      minimumStockQuantity = 0,
      warehouseLocation,
    } = req.body;

    if (
      !productName ||
      !sku ||
      !category ||
      unitPrice === undefined ||
      !warehouseLocation
    ) {
      return res.status(400).json({
        message:
          "Product name, SKU, category, unit price and warehouse location are required",
      });
    }

    if (
      Number(unitPrice) < 0 ||
      Number(initialStock) < 0 ||
      Number(minimumStockQuantity) < 0
    ) {
      return res.status(400).json({
        message: "Price and stock values cannot be negative",
      });
    }

    await client.query("BEGIN");

    const productResult = await client.query(
      `
      INSERT INTO products (
        product_name,
        sku,
        category,
        unit_price,
        current_stock,
        minimum_stock_quantity,
        warehouse_location
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        productName,
        sku,
        category,
        unitPrice,
        initialStock,
        minimumStockQuantity,
        warehouseLocation,
      ]
    );

    const product = productResult.rows[0];

    // Record initial stock as an IN movement
    if (Number(initialStock) > 0) {
      await client.query(
        `
        INSERT INTO stock_movements (
          product_id,
          quantity,
          movement_type,
          reason,
          created_by
        )
        VALUES ($1, $2, 'IN', $3, $4)
        `,
        [
          product.id,
          initialStock,
          "Initial stock",
          req.user!.userId,
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");

    console.error("Create product error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "SKU already exists",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
}

export async function getProducts(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100
    );

    const offset = (page - 1) * limit;

    const search = String(req.query.search || "").trim();
    const category = String(req.query.category || "").trim();

    const values: any[] = [];
    const conditions: string[] = [];

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          product_name ILIKE $${values.length}
          OR sku ILIKE $${values.length}
        )
      `);
    }

    if (category) {
      values.push(category);
      conditions.push(`category = $${values.length}`);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM products
      ${whereClause}
      `,
      values
    );

    const total = countResult.rows[0].total;

    values.push(limit);
    values.push(offset);

    const result = await pool.query(
      `
      SELECT *
      FROM products
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
      `,
      values
    );

    return res.json({
      products: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function getProductById(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM products
      WHERE id = $1
      `,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.json({
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Get product error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function updateProduct(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const {
      productName,
      sku,
      category,
      unitPrice,
      minimumStockQuantity,
      warehouseLocation,
    } = req.body;

    if (
      !productName ||
      !sku ||
      !category ||
      unitPrice === undefined ||
      minimumStockQuantity === undefined ||
      !warehouseLocation
    ) {
      return res.status(400).json({
        message:
          "Product name, SKU, category, unit price, minimum stock quantity and warehouse location are required",
      });
    }

    if (
      Number(unitPrice) < 0 ||
      Number(minimumStockQuantity) < 0
    ) {
      return res.status(400).json({
        message: "Price and minimum stock quantity cannot be negative",
      });
    }

    const result = await pool.query(
      `
      UPDATE products
      SET
        product_name = $1,
        sku = $2,
        category = $3,
        unit_price = $4,
        minimum_stock_quantity = $5,
        warehouse_location = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
      `,
      [
        productName,
        sku,
        category,
        unitPrice,
        minimumStockQuantity,
        warehouseLocation,
        productId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.json({
      message: "Product updated successfully",
      product: result.rows[0],
    });
  } catch (error: any) {
    console.error("Update product error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "SKU already exists",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function createStockMovement(
  req: AuthenticatedRequest,
  res: Response
) {
  const client = await pool.connect();

  try {
    const productId = Number(req.params.id);

    const {
      quantity,
      movementType,
      reason,
    } = req.body;

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    if (
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) <= 0
    ) {
      return res.status(400).json({
        message: "Quantity must be a positive integer",
      });
    }

    if (!["IN", "OUT"].includes(movementType)) {
      return res.status(400).json({
        message: "Movement type must be IN or OUT",
      });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        message: "Reason is required",
      });
    }

    await client.query("BEGIN");

    // Lock the product row to prevent conflicting stock updates
    const productResult = await client.query(
      `
      SELECT *
      FROM products
      WHERE id = $1
      FOR UPDATE
      `,
      [productId]
    );

    if (productResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Product not found",
      });
    }

    const product = productResult.rows[0];
    const stockChange = Number(quantity);

    if (
      movementType === "OUT" &&
      product.current_stock < stockChange
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Insufficient stock",
        currentStock: product.current_stock,
        requestedQuantity: stockChange,
      });
    }

    const newStock =
      movementType === "IN"
        ? product.current_stock + stockChange
        : product.current_stock - stockChange;

    await client.query(
      `
      UPDATE products
      SET
        current_stock = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [newStock, productId]
    );

    const movementResult = await client.query(
      `
      INSERT INTO stock_movements (
        product_id,
        quantity,
        movement_type,
        reason,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        productId,
        stockChange,
        movementType,
        reason,
        req.user!.userId,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Stock movement recorded successfully",
      movement: movementResult.rows[0],
      currentStock: newStock,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Stock movement error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
}

export async function getStockMovements(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const productResult = await pool.query(
      "SELECT id FROM products WHERE id = $1",
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const result = await pool.query(
      `
      SELECT
        sm.id,
        sm.quantity,
        sm.movement_type,
        sm.reason,
        sm.created_at,
        u.id AS created_by_id,
        u.name AS created_by_name
      FROM stock_movements sm
      JOIN users u ON u.id = sm.created_by
      WHERE sm.product_id = $1
      ORDER BY sm.created_at DESC
      `,
      [productId]
    );

    return res.json({
      movements: result.rows,
    });
  } catch (error) {
    console.error("Get stock movements error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function getLowStockProducts(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM products
      WHERE current_stock <= minimum_stock_quantity
      ORDER BY current_stock ASC, product_name ASC
      `
    );

    return res.json({
      products: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Get low stock products error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}