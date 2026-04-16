import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { store } from "../data/store.js";

export function signToken(userId) {
  return jwt.sign({ userId }, config.jwtSecret, {
    expiresIn: "7d"
  });
}

export async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await store.findUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: "Invalid token user." });
    }
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}
