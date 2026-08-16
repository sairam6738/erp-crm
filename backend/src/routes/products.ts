import { Router } from "express";
import { z } from "zod";
import { query } from "../db";
import {
  requireAuth,
  requireRoles
} from "../middleware/auth";

const router = Router();

router.use(requireAuth);


/*
 * Product validation
 */
const productSchema = z.object({
  name: z.string().min(2),

  sku: z.string().min(2),

  category: z.string().min(2),

  unit_price: z
    .number()
    .nonnegative(),

  current_stock: z
    .number()
    .int()
    .nonnegative(),

  minimum_stock: z
    .number()
    .int()
    .nonnegative(),

  warehouse: z.string().min(1)
});


/*
 * GET ALL PRODUCTS
 *
 * GET /api/products
 */
router.get(
  "/",
  async (_req, res, next) => {

    try {

      const result = await query(
        `
        SELECT *
        FROM products
        ORDER BY id DESC
        `
      );

      res.json(
        result.rows
      );

    } catch (e) {

      next(e);

    }

  }
);


/*
 * GET ALL STOCK MOVEMENTS
 *
 * GET /api/products/movements/all
 *
 * IMPORTANT:
 * This route is before /:id
 * so "movements" isn't treated as an ID.
 */
router.get(
  "/movements/all",
  async (_req, res, next) => {

    try {

      const result = await query(
        `
        SELECT
          sm.*,
          p.name AS product_name,
          u.name AS created_by_name
        FROM stock_movements sm
        JOIN products p
          ON p.id = sm.product_id
        JOIN users u
          ON u.id = sm.created_by
        ORDER BY sm.id DESC
        `
      );

      res.json(
        result.rows
      );

    } catch (e) {

      next(e);

    }

  }
);


/*
 * CREATE PRODUCT
 *
 * POST /api/products
 */
router.post(
  "/",
  requireRoles(
    "ADMIN",
    "WAREHOUSE"
  ),
  async (req, res, next) => {

    try {

      const b =
        productSchema.parse(
          req.body
        );

      const result =
        await query(
          `
          INSERT INTO products
          (
            name,
            sku,
            category,
            unit_price,
            current_stock,
            minimum_stock,
            warehouse
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          )
          RETURNING *
          `,
          [
            b.name,
            b.sku,
            b.category,
            b.unit_price,
            b.current_stock,
            b.minimum_stock,
            b.warehouse
          ]
        );

      res
        .status(201)
        .json(
          result.rows[0]
        );

    } catch (e: any) {

      /*
       * Duplicate SKU
       */
      if (
        e?.code === "23505"
      ) {

        return res
          .status(409)
          .json({
            message:
              "SKU already exists"
          });

      }

      next(e);

    }

  }
);


/*
 * UPDATE EXISTING PRODUCT
 *
 * PUT /api/products/:id
 *
 * This is what the Edit button
 * in App.tsx will call.
 */
router.put(
  "/:id",
  requireRoles(
    "ADMIN",
    "WAREHOUSE"
  ),
  async (req, res, next) => {

    try {

      const b =
        productSchema.parse(
          req.body
        );

      const result =
        await query(
          `
          UPDATE products
          SET
            name = $1,
            sku = $2,
            category = $3,
            unit_price = $4,
            current_stock = $5,
            minimum_stock = $6,
            warehouse = $7
          WHERE id = $8
          RETURNING *
          `,
          [
            b.name,
            b.sku,
            b.category,
            b.unit_price,
            b.current_stock,
            b.minimum_stock,
            b.warehouse,
            req.params.id
          ]
        );


      if (
        !result.rows[0]
      ) {

        return res
          .status(404)
          .json({
            message:
              "Product not found"
          });

      }


      res.json(
        result.rows[0]
      );

    } catch (e: any) {

      /*
       * Duplicate SKU
       */
      if (
        e?.code === "23505"
      ) {

        return res
          .status(409)
          .json({
            message:
              "SKU already exists"
          });

      }

      next(e);

    }

  }
);


export default router;