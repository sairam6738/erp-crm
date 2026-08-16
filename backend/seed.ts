import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { query, pool } from "./src/db";

dotenv.config();

async function seed() {
  const password = await bcrypt.hash("Password123", 10);

  const users = [
    ["Admin User","admin@example.com",password,"ADMIN"],
    ["Sales User","sales@example.com",password,"SALES"],
    ["Warehouse User","warehouse@example.com",password,"WAREHOUSE"],
    ["Accounts User","accounts@example.com",password,"ACCOUNTS"]
  ];

  for (const u of users) {
    await query(
      `INSERT INTO users(name,email,password_hash,role)
       VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING`,
      u
    );
  }

  await query(
    `INSERT INTO customers(name,mobile,email,business_name,customer_type,address,status)
     VALUES('ABC Traders','9876543210','abc@example.com','ABC Traders','Wholesale','Vadodara','Active')
     ON CONFLICT DO NOTHING`
  );

  await query(
    `INSERT INTO products(name,sku,category,unit_price,current_stock,minimum_stock,warehouse)
     VALUES('Dell Laptop','DELL-001','Electronics',50000,20,5,'WH-01')
     ON CONFLICT(sku) DO NOTHING`
  );

  console.log("Seed complete. Password for all demo users: Password123");
  await pool.end();
}
seed().catch(async e => { console.error(e); await pool.end(); process.exit(1); });
