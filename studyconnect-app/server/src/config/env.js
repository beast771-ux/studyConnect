import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 8000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "studyconnect-dev-secret",
  mongodbUri: process.env.MONGO_URI || process.env.MONGODB_URI || ""
};
