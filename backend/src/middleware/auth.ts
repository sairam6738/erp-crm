import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";


export type UserRole =
  | "ADMIN"
  | "SALES"
  | "WAREHOUSE"
  | "ACCOUNTS";


export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}


declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}


/*
 * REQUIRE LOGIN
 */

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {

  try {

    const header =
      req.headers.authorization;


    if (!header) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }


    /*
     * Expected:
     *
     * Authorization: Bearer TOKEN
     */

    const parts =
      header.split(" ");


    if (
      parts.length !== 2 ||
      parts[0] !== "Bearer"
    ) {

      return res.status(401).json({
        message: "Invalid authorization header"
      });

    }


    const token = parts[1];

    const secret =
      process.env.JWT_SECRET;


    if (!secret) {
      throw new Error(
        "JWT_SECRET is not configured"
      );
    }


    const decoded =
      jwt.verify(
        token,
        secret
      ) as AuthUser;


    req.user = decoded;

    next();

  } catch (e) {

    return res.status(401).json({
      message: "Invalid or expired token"
    });

  }
}


/*
 * REQUIRE SPECIFIC ROLE
 */

export function requireRoles(
  ...roles: UserRole[]
) {

  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {

    if (!req.user) {

      return res.status(401).json({
        message:
          "Authentication required"
      });

    }


    if (
      !roles.includes(
        req.user.role
      )
    ) {

      return res.status(403).json({
        message:
          "You do not have permission to perform this action"
      });

    }


    next();
  };
}