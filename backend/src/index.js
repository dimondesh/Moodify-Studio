import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { connectDB } from "./lib/db.js";
import userRoutes from "./routes/user.route.js";
import adminRoutes from "./routes/admin.route.js";
import authRoutes from "./routes/auth.route.js";
import songRoutes from "./routes/song.route.js";
import albumRoutes from "./routes/album.route.js";
import statsRoutes from "./routes/stat.route.js";
import searchRoutes from "./routes/search.route.js";
import playlistRoutes from "./routes/playlist.route.js";
import fileUpload from "express-fileupload";
import path from "path";
import cors from "cors";
import cron from "node-cron";
import fs from "fs";
import { initializeSocket, io } from "./lib/socket.js";
import libraryRoutes from "./routes/library.route.js";
import { protectRoute } from "./middleware/auth.middleware.js";
import { Playlist } from "./models/playlist.model.js";
import artistRoutes from "./routes/artist.route.js";
import mixRoutes from "./routes/mix.route.js";
import cronRoutes from "./routes/cron.route.js";
import shareRoutes from "./routes/share.route.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const app = express();

const __dirname = path.resolve();

const httpServer = createServer(app);
initializeSocket(httpServer);
const allowedOrigin = process.env.CLIENT_ORIGIN_URL;

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, "temp"),
    createParentPath: true,
    limits: { fileSize: 400 * 1024 * 1024 }, // 50 MB
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
app.use((req, res, next) => {
  req.io = io;
  next();
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
app.use("/api/playlists", playlistRoutes);
app.use("/api/artists", artistRoutes);
app.use("/api/mixes", mixRoutes);
app.use("/api/cron", cronRoutes);
app.use("/api/share", shareRoutes);

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR HANDLER CAUGHT AN ERROR:");
  console.error(err);
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
  console.log(
    `Server on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`
  );
});
