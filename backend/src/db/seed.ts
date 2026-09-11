import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { pool } from "../config/database";

dotenv.config();

const users = [
  {
    name: "System Admin",
    email: "admin@minierp.test",
    password: "Admin@123",
    role: "ADMIN",
  },
  {
    name: "Sales User",
    email: "sales@minierp.test",
    password: "Sales@123",
    role: "SALES",
  },
  {
    name: "Warehouse User",
    email: "warehouse@minierp.test",
    password: "Warehouse@123",
    role: "WAREHOUSE",
  },
  {
    name: "Accounts User",
    email: "accounts@minierp.test",
    password: "Accounts@123",
    role: "ACCOUNTS",
  },
];

async function seedUsers() {
  try {
    console.log("Creating test users...");

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);

      await pool.query(
        `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email)
        DO UPDATE SET
          name = EXCLUDED.name,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role
        `,
        [user.name, user.email, passwordHash, user.role]
      );

      console.log(`Created/updated: ${user.email}`);
    }

    console.log("User seeding completed.");
  } catch (error) {
    console.error("User seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedUsers();