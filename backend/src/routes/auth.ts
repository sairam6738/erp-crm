import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});


/*
 * LOGIN
 *
 * POST /api/auth/login
 */
router.post("/login", async (req, res, next) => {
  try {

    const body = loginSchema.parse(req.body);

    const email = body.email
      .trim()
      .toLowerCase();

    /*
     * Find user
     */

    const result = await query(
      `
      SELECT
        id,
        name,
        email,
        password_hash,
        role
      FROM users
      WHERE LOWER(email) = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const user = result.rows[0];


    /*
     * Check password
     */

    const passwordValid =
      await bcrypt.compare(
        body.password,
        user.password_hash
      );

    if (!passwordValid) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }


    /*
     * Create JWT
     */

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(
        "JWT_SECRET is not configured"
      );
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      secret,
      {
        expiresIn: "8h"
      }
    );


    /*
     * Send response
     */

    res.json({
      message: "Login successful",

      token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (e) {
    next(e);
  }
});


export default router;