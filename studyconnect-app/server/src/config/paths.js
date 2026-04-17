import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const serverRoot = path.resolve(currentDir, "..", "..");
export const workspaceRoot = path.resolve(serverRoot, "..");

export const uploadsDir = path.resolve(serverRoot, "server", "uploads");
export const avatarsDir = path.resolve(uploadsDir, "avatars");

export const clientDistDir = path.resolve(workspaceRoot, "client", "dist");
export const clientIndexPath = path.resolve(clientDistDir, "index.html");
