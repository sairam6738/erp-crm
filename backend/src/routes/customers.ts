import { Router } from "express";
import { z } from "zod";
import { query } from "../db";
import { requireAuth, requireRoles } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

/*
 * Customer validation
 */
const customerSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().min(7),
  email: z.string().email(),
  business_name: z.string().min(2),

  gst_number: z
    .string()
    .optional()
    .nullable(),

  customer_type: z.enum([
    "Retail",
    "Wholesale",
    "Distributor"
  ]),

  address: z.string().min(2),

  status: z.enum([
    "Lead",
    "Active",
    "Inactive"
  ]),

  follow_up_date: z
    .string()
    .optional()
    .nullable(),

  notes: z
    .string()
    .optional()
    .nullable()
});


/*
 * GET ALL CUSTOMERS
 *
 * Supports:
 *  - Search by name
 *  - Search by business name
 *  - Search by mobile
 *  - Follow-up date filter
 *  - Pagination
 *
 * Examples:
 *
 * GET /api/customers
 *
 * GET /api/customers?search=Rahul
 *
 * GET /api/customers?follow_up_date=2026-08-20
 *
 * GET /api/customers?search=Rahul&follow_up_date=2026-08-20
 */
router.get(
  "/",
  async (req, res, next) => {

    try {

      const search = String(
        req.query.search || ""
      ).trim();

      const followUpDate = String(
        req.query.follow_up_date || ""
      ).trim();

      const page = Math.max(
        Number(req.query.page || 1),
        1
      );

      const limit = Math.min(
        Math.max(
          Number(req.query.limit || 10),
          1
        ),
        100
      );

      const offset =
        (page - 1) * limit;

      const searchValue =
        `%${search}%`;


      /*
       * Get customers
       */
      const result = await query(
        `
        SELECT *
        FROM customers
        WHERE
          (
            $1 = ''
            OR name ILIKE $2
            OR business_name ILIKE $2
            OR mobile ILIKE $2
          )
          AND
          (
            $3 = ''
            OR follow_up_date::date = $3::date
          )
        ORDER BY id DESC
        LIMIT $4
        OFFSET $5
        `,
        [
          search,
          searchValue,
          followUpDate,
          limit,
          offset
        ]
      );


      /*
       * Get total count
       */
      const count = await query(
        `
        SELECT COUNT(*)::int AS total
        FROM customers
        WHERE
          (
            $1 = ''
            OR name ILIKE $2
            OR business_name ILIKE $2
            OR mobile ILIKE $2
          )
          AND
          (
            $3 = ''
            OR follow_up_date::date = $3::date
          )
        `,
        [
          search,
          searchValue,
          followUpDate
        ]
      );


      res.json({
        data: result.rows,
        page,
        limit,
        total: count.rows[0].total
      });

    } catch (e) {

      next(e);

    }

  }
);


/*
 * GET CUSTOMER BY ID
 *
 * GET /api/customers/:id
 */
router.get(
  "/:id",
  async (req, res, next) => {

    try {

      const result = await query(
        `
        SELECT *
        FROM customers
        WHERE id = $1
        `,
        [req.params.id]
      );


      if (!result.rows[0]) {

        return res.status(404).json({
          message: "Customer not found"
        });

      }


      res.json(
        result.rows[0]
      );

    } catch (e) {

      next(e);

    }

  }
);


/*
 * CREATE CUSTOMER
 *
 * POST /api/customers
 */
router.post(
  "/",
  requireRoles("ADMIN", "SALES"),
  async (req, res, next) => {

    try {

      const b =
        customerSchema.parse(
          req.body
        );


      const result =
        await query(
          `
          INSERT INTO customers
          (
            name,
            mobile,
            email,
            business_name,
            gst_number,
            customer_type,
            address,
            status,
            follow_up_date,
            notes
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10
          )
          RETURNING *
          `,
          [
            b.name,
            b.mobile,
            b.email,
            b.business_name,
            b.gst_number || null,
            b.customer_type,
            b.address,
            b.status,
            b.follow_up_date || null,
            b.notes || null
          ]
        );


      res.status(201).json(
        result.rows[0]
      );

    } catch (e) {

      next(e);

    }

  }
);


/*
 * UPDATE CUSTOMER
 *
 * PUT /api/customers/:id
 *
 * Updates:
 *  - Name
 *  - Mobile
 *  - Email
 *  - Business
 *  - GST
 *  - Customer type
 *  - Address
 *  - Status
 *  - Follow-up date
 *  - Notes
 */
router.put(
  "/:id",
  requireRoles("ADMIN", "SALES"),
  async (req, res, next) => {

    try {

      const b =
        customerSchema.parse(
          req.body
        );


      const result =
        await query(
          `
          UPDATE customers
          SET
            name = $1,
            mobile = $2,
            email = $3,
            business_name = $4,
            gst_number = $5,
            customer_type = $6,
            address = $7,
            status = $8,
            follow_up_date = $9,
            notes = $10
          WHERE id = $11
          RETURNING *
          `,
          [
            b.name,
            b.mobile,
            b.email,
            b.business_name,
            b.gst_number || null,
            b.customer_type,
            b.address,
            b.status,
            b.follow_up_date || null,
            b.notes || null,
            req.params.id
          ]
        );


      if (!result.rows[0]) {

        return res.status(404).json({
          message: "Customer not found"
        });

      }


      res.json(
        result.rows[0]
      );

    } catch (e) {

      next(e);

    }

  }
);


export default router;