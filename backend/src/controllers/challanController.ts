import { Response } from "express";
import { pool } from "../config/database";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

type ChallanItem = {
  productId: number;
  quantity: number;
};

export async function createChallan(
  req: AuthenticatedRequest,
  res: Response
) {
  const client = await pool.connect();

  try {
    const { customerId, items } = req.body;

    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Customer ID and at least one product are required",
      });
    }

    const parsedCustomerId = Number(customerId);

    if (
      !Number.isInteger(parsedCustomerId) ||
      parsedCustomerId <= 0
    ) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }

    const parsedItems: ChallanItem[] = items.map((item: any) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
    }));

    for (const item of parsedItems) {
      if (
        !Number.isInteger(item.productId) ||
        item.productId <= 0 ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        return res.status(400).json({
          message:
            "Each product must have a valid product ID and positive quantity",
        });
      }
    }

    await client.query("BEGIN");

    const customerResult = await client.query(
      `
      SELECT id, customer_name, business_name
      FROM customers
      WHERE id = $1
      `,
      [parsedCustomerId]
    );

    if (customerResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const productIds = parsedItems.map((item) => item.productId);

    const productResult = await client.query(
      `
      SELECT
        id,
        product_name,
        sku,
        unit_price,
        current_stock
      FROM products
      WHERE id = ANY($1::int[])
      `,
      [productIds]
    );

    if (productResult.rows.length !== productIds.length) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "One or more products were not found",
      });
    }

    const products = productResult.rows;

    const productMap = new Map(
      products.map((product) => [product.id, product])
    );

    let totalQuantity = 0;

    for (const item of parsedItems) {
      const product = productMap.get(item.productId);

      if (!product) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: `Product ${item.productId} not found`,
        });
      }

      totalQuantity += item.quantity;
    }

    const year = new Date().getFullYear();

    const sequenceResult = await client.query(
      `
      SELECT COUNT(*)::int AS count
      FROM challans
      WHERE EXTRACT(YEAR FROM created_at) = $1
      `,
      [year]
    );

    const nextNumber = sequenceResult.rows[0].count + 1;

    const challanNumber = `CH-${year}-${String(nextNumber).padStart(
      5,
      "0"
    )}`;

    const challanResult = await client.query(
      `
      INSERT INTO challans (
        challan_number,
        customer_id,
        total_quantity,
        status,
        created_by
      )
      VALUES ($1, $2, $3, 'DRAFT', $4)
      RETURNING *
      `,
      [
        challanNumber,
        parsedCustomerId,
        totalQuantity,
        req.user!.userId,
      ]
    );

    const challan = challanResult.rows[0];

    for (const item of parsedItems) {
      const product = productMap.get(item.productId);

      await client.query(
        `
        INSERT INTO challan_items (
          challan_id,
          product_id,
          product_name,
          sku,
          unit_price,
          quantity,
          total_price
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          challan.id,
          product.id,
          product.product_name,
          product.sku,
          product.unit_price,
          item.quantity,
          Number(product.unit_price) * item.quantity,
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Challan created successfully",
      challan,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create challan error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
}

export async function getChallans(
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

    const status = String(req.query.status || "")
      .trim()
      .toUpperCase();

    const search = String(req.query.search || "").trim();

    const values: any[] = [];
    const conditions: string[] = [];

    if (status) {
      values.push(status);
      conditions.push(`c.status = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          c.challan_number ILIKE $${values.length}
          OR cu.customer_name ILIKE $${values.length}
          OR cu.business_name ILIKE $${values.length}
        )
      `);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM challans c
      JOIN customers cu ON cu.id = c.customer_id
      ${whereClause}
      `,
      values
    );

    const total = countResult.rows[0].total;

    values.push(limit);
    values.push(offset);

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.challan_number,
        c.customer_id,
        cu.customer_name,
        cu.business_name,
        c.total_quantity,
        c.status,
        c.created_by,
        u.name AS created_by_name,
        c.created_at,
        c.updated_at
      FROM challans c
      JOIN customers cu ON cu.id = c.customer_id
      JOIN users u ON u.id = c.created_by
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
      `,
      values
    );

    return res.json({
      challans: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get challans error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function getChallanById(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const challanId = Number(req.params.id);

    if (!Number.isInteger(challanId) || challanId <= 0) {
      return res.status(400).json({
        message: "Invalid challan ID",
      });
    }

    const challanResult = await pool.query(
      `
      SELECT
        c.*,
        cu.customer_name,
        cu.business_name,
        cu.mobile,
        cu.email,
        cu.address,
        u.name AS created_by_name
      FROM challans c
      JOIN customers cu ON cu.id = c.customer_id
      JOIN users u ON u.id = c.created_by
      WHERE c.id = $1
      `,
      [challanId]
    );

    if (challanResult.rows.length === 0) {
      return res.status(404).json({
        message: "Challan not found",
      });
    }

    const itemsResult = await pool.query(
      `
      SELECT
        id,
        product_id,
        product_name,
        sku,
        unit_price,
        quantity,
        total_price
      FROM challan_items
      WHERE challan_id = $1
      ORDER BY id
      `,
      [challanId]
    );

    return res.json({
      challan: challanResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error("Get challan error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function confirmChallan(
  req: AuthenticatedRequest,
  res: Response
) {
  const client = await pool.connect();

  try {
    const challanId = Number(req.params.id);

    if (!Number.isInteger(challanId) || challanId <= 0) {
      return res.status(400).json({
        message: "Invalid challan ID",
      });
    }

    await client.query("BEGIN");

    const challanResult = await client.query(
      `
      SELECT *
      FROM challans
      WHERE id = $1
      FOR UPDATE
      `,
      [challanId]
    );

    if (challanResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Challan not found",
      });
    }

    const challan = challanResult.rows[0];

    if (challan.status !== "DRAFT") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: `Challan cannot be confirmed because its status is ${challan.status}`,
      });
    }

    const itemsResult = await client.query(
      `
      SELECT *
      FROM challan_items
      WHERE challan_id = $1
      `,
      [challanId]
    );

    if (itemsResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Challan has no products",
      });
    }

    // Lock all affected product rows before checking stock.
    for (const item of itemsResult.rows) {
      const productResult = await client.query(
        `
        SELECT id, current_stock, product_name, sku
        FROM products
        WHERE id = $1
        FOR UPDATE
        `,
        [item.product_id]
      );

      if (productResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          message: `Product ${item.product_id} not found`,
        });
      }

      const product = productResult.rows[0];

      if (product.current_stock < item.quantity) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "Insufficient stock",
          product: product.product_name,
          sku: product.sku,
          currentStock: product.current_stock,
          requestedQuantity: item.quantity,
        });
      }
    }

    // Reduce stock and create OUT movements.
    for (const item of itemsResult.rows) {
      await client.query(
        `
        UPDATE products
        SET
          current_stock = current_stock - $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [item.quantity, item.product_id]
      );

      await client.query(
        `
        INSERT INTO stock_movements (
          product_id,
          quantity,
          movement_type,
          reason,
          created_by
        )
        VALUES ($1, $2, 'OUT', $3, $4)
        `,
        [
          item.product_id,
          item.quantity,
          `Sales challan ${challan.challan_number}`,
          req.user!.userId,
        ]
      );
    }

    const updatedChallanResult = await client.query(
      `
      UPDATE challans
      SET
        status = 'CONFIRMED',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [challanId]
    );

    await client.query("COMMIT");

    return res.json({
      message: "Challan confirmed successfully",
      challan: updatedChallanResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Confirm challan error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
}

export async function cancelChallan(
  req: AuthenticatedRequest,
  res: Response
) {
  const client = await pool.connect();

  try {
    const challanId = Number(req.params.id);

    if (!Number.isInteger(challanId) || challanId <= 0) {
      return res.status(400).json({
        message: "Invalid challan ID",
      });
    }

    await client.query("BEGIN");

    const challanResult = await client.query(
      `
      SELECT *
      FROM challans
      WHERE id = $1
      FOR UPDATE
      `,
      [challanId]
    );

    if (challanResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Challan not found",
      });
    }

    const challan = challanResult.rows[0];

    if (challan.status === "CANCELLED") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Challan is already cancelled",
      });
    }

    // If confirmed, restore stock.
    if (challan.status === "CONFIRMED") {
      const itemsResult = await client.query(
        `
        SELECT product_id, quantity
        FROM challan_items
        WHERE challan_id = $1
        `,
        [challanId]
      );

      for (const item of itemsResult.rows) {
        await client.query(
          `
          UPDATE products
          SET
            current_stock = current_stock + $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          `,
          [item.quantity, item.product_id]
        );

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
            item.product_id,
            item.quantity,
            `Cancellation of challan ${challan.challan_number}`,
            req.user!.userId,
          ]
        );
      }
    }

    const result = await client.query(
      `
      UPDATE challans
      SET
        status = 'CANCELLED',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [challanId]
    );

    await client.query("COMMIT");

    return res.json({
      message: "Challan cancelled successfully",
      challan: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Cancel challan error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
}