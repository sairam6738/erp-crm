import { Router } from "express";
import { z } from "zod";
import { pool, query } from "../db";
import { AuthRequest, requireAuth, requireRoles } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const itemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive()
});

const challanSchema = z.object({
  customer_id: z.number().int().positive(),
  items: z.array(itemSchema).min(1)
});

router.get("/", async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, cu.name AS customer_name, u.name AS created_by_name
       FROM challans c
       JOIN customers cu ON cu.id=c.customer_id
       JOIN users u ON u.id=c.created_by
       ORDER BY c.id DESC`
    );
    res.json(result.rows);
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const c = await query(
      `SELECT c.*, cu.name AS customer_name, u.name AS created_by_name
       FROM challans c JOIN customers cu ON cu.id=c.customer_id
       JOIN users u ON u.id=c.created_by WHERE c.id=$1`,
      [req.params.id]
    );
    if (!c.rows[0]) return res.status(404).json({ message: "Challan not found" });

    const items = await query(`SELECT * FROM challan_items WHERE challan_id=$1`, [req.params.id]);
    res.json({ ...c.rows[0], items: items.rows });
  } catch (e) { next(e); }
});

router.post("/", requireRoles("ADMIN", "SALES"), async (req: AuthRequest, res, next) => {
  const client = await pool.connect();
  try {
    const b = challanSchema.parse(req.body);
    await client.query("BEGIN");

    const customer = await client.query(`SELECT id FROM customers WHERE id=$1`, [b.customer_id]);
    if (!customer.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Customer not found" });
    }

    const products = [];
    for (const item of b.items) {
      const p = await client.query(`SELECT * FROM products WHERE id=$1`, [item.product_id]);
      if (!p.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: `Product ${item.product_id} not found` });
      }
      products.push({ product: p.rows[0], quantity: item.quantity });
    }

    const numberResult = await client.query(
      `SELECT 'SC-' || TO_CHAR(CURRENT_DATE,'YYYYMMDD') || '-' ||
       LPAD((COUNT(*) + 1)::text, 4, '0') AS number FROM challans WHERE created_at::date=CURRENT_DATE`
    );
    const challanNumber = numberResult.rows[0].number;

    const c = await client.query(
      `INSERT INTO challans(challan_number,customer_id,total_quantity,status,created_by)
       VALUES($1,$2,$3,'Draft',$4) RETURNING *`,
      [challanNumber, b.customer_id, b.items.reduce((s, i) => s + i.quantity, 0), req.user!.id]
    );

    for (const x of products) {
      const p = x.product;
      await client.query(
        `INSERT INTO challan_items(challan_id,product_id,product_name,sku,unit_price,quantity)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [c.rows[0].id,p.id,p.name,p.sku,p.unit_price,x.quantity]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ ...c.rows[0], items: b.items });
  } catch (e) {
    await client.query("ROLLBACK");
    next(e);
  } finally {
    client.release();
  }
});

router.put("/:id/confirm", requireRoles("ADMIN", "SALES"), async (req: AuthRequest, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const c = await client.query(`SELECT * FROM challans WHERE id=$1 FOR UPDATE`, [req.params.id]);
    if (!c.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Challan not found" });
    }
    if (c.rows[0].status !== "Draft") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Only Draft challans can be confirmed" });
    }

    const items = await client.query(`SELECT * FROM challan_items WHERE challan_id=$1`, [req.params.id]);

    for (const item of items.rows) {
      const p = await client.query(`SELECT * FROM products WHERE id=$1 FOR UPDATE`, [item.product_id]);
      if (!p.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: `Product ${item.product_id} not found` });
      }
      if (p.rows[0].current_stock < item.quantity) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Insufficient stock for ${p.rows[0].name}`,
          available: p.rows[0].current_stock,
          requested: item.quantity
        });
      }

      await client.query(
        `UPDATE products SET current_stock=current_stock-$1 WHERE id=$2`,
        [item.quantity, item.product_id]
      );
      await client.query(
        `INSERT INTO stock_movements(product_id,quantity,movement_type,reason,created_by)
         VALUES($1,$2,'OUT',$3,$4)`,
        [item.product_id,item.quantity,`Sales Challan ${c.rows[0].challan_number}`,req.user!.id]
      );
    }

    const updated = await client.query(
      `UPDATE challans SET status='Confirmed' WHERE id=$1 RETURNING *`,
      [req.params.id]
    );

    await client.query("COMMIT");
    res.json(updated.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    next(e);
  } finally {
    client.release();
  }
});

export default router;
