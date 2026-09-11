import dotenv from "dotenv";
import { Pool } from "pg";
import { getDatabasePassword } from "./secrets";

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,

  password:
    process.env.NODE_ENV === "production"
      ? getDatabasePassword
      : process.env.DB_PASSWORD,

  ssl: {
    rejectUnauthorized: false,
  },
});