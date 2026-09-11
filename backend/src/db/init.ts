import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { pool } from "../config/database";

dotenv.config();

async function initializeDatabase() {
  try {
    const schemaPath = path.join(__dirname, "../../../database/schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");

    console.log("Connecting to AWS RDS...");
    await pool.query(schema);

    console.log("Database schema created successfully.");
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

initializeDatabase();