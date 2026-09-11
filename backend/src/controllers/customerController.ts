import { Request, Response } from "express";
import { pool } from "../config/database";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

export async function createCustomer(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const {
      customerName,
      mobile,
      email,
      businessName,
      gstNumber,
      customerType,
      address,
      status,
      followUpDate,
    } = req.body;

    if (
      !customerName ||
      !mobile ||
      !customerType ||
      !address
    ) {
      return res.status(400).json({
        message:
          "Customer name, mobile, customer type and address are required",
      });
    }
    const duplicateCheck = await pool.query(
  `
  SELECT id
  FROM customers
  WHERE mobile = $1
    AND business_name IS NOT DISTINCT FROM $2
  LIMIT 1
  `,
  [mobile, businessName || null]
);

if (duplicateCheck.rows.length > 0) {
  return res.status(409).json({
    message: "A customer with this mobile number and business already exists",
  });
}
    const result = await pool.query(
      `
      INSERT INTO customers (
        customer_name,
        mobile,
        email,
        business_name,
        gst_number,
        customer_type,
        address,
        status,
        follow_up_date
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        customerName,
        mobile,
        email || null,
        businessName || null,
        gstNumber || null,
        customerType,
        address,
        status || "LEAD",
        followUpDate || null,
      ]
    );

    return res.status(201).json({
      message: "Customer created successfully",
      customer: result.rows[0],
    });
  } catch (error) {
    console.error("Create customer error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
export async function getCustomers(
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
    const status = String(req.query.status || "").trim();

    const values: any[] = [];
    const conditions: string[] = [];

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          customer_name ILIKE $${values.length}
          OR mobile ILIKE $${values.length}
          OR business_name ILIKE $${values.length}
        )
      `);
    }

    if (status) {
      values.push(status.toUpperCase());
      conditions.push(`status = $${values.length}`);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM customers
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
      FROM customers
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
      `,
      values
    );

    return res.json({
      customers: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get customers error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
export async function getCustomerById(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM customers
      WHERE id = $1
      `,
      [customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    return res.json({
      customer: result.rows[0],
    });
  } catch (error) {
    console.error("Get customer error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
export async function addFollowUp(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const customerId = Number(req.params.id);
    const { followUpDate, note } = req.body;

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }

    if (!followUpDate || !note) {
      return res.status(400).json({
        message: "Follow-up date and note are required",
      });
    }

    const customerResult = await pool.query(
      "SELECT id FROM customers WHERE id = $1",
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO follow_ups (
        customer_id,
        follow_up_date,
        note,
        created_by
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        customerId,
        followUpDate,
        note,
        req.user!.userId,
      ]
    );

    // Keep the customer's next follow-up date updated
    await pool.query(
      `
      UPDATE customers
      SET follow_up_date = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [followUpDate, customerId]
    );

    return res.status(201).json({
      message: "Follow-up added successfully",
      followUp: result.rows[0],
    });
  } catch (error) {
    console.error("Add follow-up error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function getFollowUps(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }

    const customerResult = await pool.query(
      "SELECT id FROM customers WHERE id = $1",
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const result = await pool.query(
      `
      SELECT
        f.id,
        f.follow_up_date,
        f.note,
        f.created_at,
        u.id AS created_by_id,
        u.name AS created_by_name
      FROM follow_ups f
      JOIN users u ON u.id = f.created_by
      WHERE f.customer_id = $1
      ORDER BY f.follow_up_date DESC, f.created_at DESC
      `,
      [customerId]
    );

    return res.json({
      followUps: result.rows,
    });
  } catch (error) {
    console.error("Get follow-ups error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}