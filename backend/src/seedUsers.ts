import bcrypt from "bcryptjs";
import { query } from "./db";

const users = [
  {
    name: "Admin User",
    email: "admin@example.com",
    password: "Password123",
    role: "ADMIN"
  },
  {
    name: "Sales User",
    email: "sales@example.com",
    password: "Password123",
    role: "SALES"
  },
  {
    name: "Warehouse User",
    email: "warehouse@example.com",
    password: "Password123",
    role: "WAREHOUSE"
  },
  {
    name: "Accounts User",
    email: "accounts@example.com",
    password: "Password123",
    role: "ACCOUNTS"
  }
];

async function seed() {
  try {
    for (const user of users) {
      const passwordHash = await bcrypt.hash(
        user.password,
        10
      );

      await query(
        `
        INSERT INTO users
        (
          name,
          email,
          password_hash,
          role
        )
        VALUES
        ($1, $2, $3, $4)
        ON CONFLICT (email)
        DO UPDATE SET
          name = EXCLUDED.name,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role
        `,
        [
          user.name,
          user.email,
          passwordHash,
          user.role
        ]
      );
    }

    console.log("Users seeded successfully.");
    console.log(
      "Password for all demo users: Password123"
    );

    process.exit(0);

  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();