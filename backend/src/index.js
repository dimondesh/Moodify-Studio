import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { connectDB } from "./lib/db.js";
import userRoutes from "./routes/user.route.js";
import adminRoutes from "./routes/admin.route.js";
import authRoutes from "./routes/auth.route.js";
import songRoutes from "./routes/song.route.js";
import albumRoutes from "./routes/album.route.js";
import statsRoutes from "./routes/stat.route.js";
import searchRoutes from "./routes/search.route.js";
import fileUpload from "express-fileupload";
import path from "path";
import cors from "cors";
import { initializeSocket } from "./lib/socket.js";
import cron from "node-cron";
import fs from "fs";
import libraryRoutes from "./routes/library.route.js";
import { protectRoute } from "./middleware/auth.middleware.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const app = express();

const __dirname = path.resolve();

const httpServer = createServer(app);
initializeSocket(httpServer); // Здесь Socket.IO инициализируется

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, "temp"),
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  })
);

const tempDir = path.join(process.cwd(), "temp");
cron.schedule("*/10 * * * *", () => {
  if (fs.existsSync(tempDir)) {
    fs.readdir(tempDir, (err, files) => {
      if (err) {
        console.log("error", err);
        return;
      }

      for (const file of files) {
        fs.unlink(path.join(tempDir, file), (err) => {});
      }
    });
  }
});

const jsonParser = express.json();
app.use(jsonParser);

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/library", libraryRoutes);

app.use((err, req, res, next) => {
  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

httpServer.listen(PORT, () => {
  connectDB();
  console.log(`Server on port ${PORT}`);
});
