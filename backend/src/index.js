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
import generatedPlaylistRoutes from "./routes/generatedPlaylist.route.js";
import imageRoutes from "./routes/image.route.js";
import { updateDailyMixes } from "./controller/mix.controller.js";
import { ListenHistory } from "./models/listenHistory.model.js";
import {
  generateOnRepeatPlaylistForUser,
  generateDiscoverWeeklyForUser,
  generateOnRepeatRewindForUser,
} from "./lib/playlistGenerator.service.js";
import { User } from "./models/user.model.js";
import {
  generateNewReleasesForUser,
  generatePlaylistRecommendationsForUser,
  generateFeaturedSongsForUser,
} from "./lib/recommendation.service.js";
import homeRoutes from "./routes/home.route.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const app = express();

const __dirname = path.resolve();

const httpServer = createServer(app);
const { userSockets, userActivities } = initializeSocket(httpServer);

// --- НАЧАЛО БЛОКА CORS ---
// Определяем разрешенные домены из переменных окружения
const allowedOrigins = [
  process.env.CLIENT_ORIGIN_URL,
  process.env.ADMIN_ORIGIN_URL,
];

// Логируем конфигурацию для удобной отладки при старте сервера
console.log(
  `CORS middleware configured for origins: ${allowedOrigins.join(", ")}`
);

// Используем middleware cors с функцией для более гибкой проверки
app.use(
  cors({
    origin: function (origin, callback) {
      // Разрешаем запросы без origin (например, Postman, мобильные приложения)
      // или если origin есть в нашем списке разрешенных
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        // Блокируем запросы с других доменов
        console.warn(`CORS: Blocked origin -> ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Это критически важно для передачи токенов аутентификации
  })
);
// --- КОНЕЦ БЛОКА CORS ---

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, "temp"),
    createParentPath: true,
    limits: { fileSize: 800 * 1024 * 1024 },
  })
);

const tempDir = path.join(process.cwd(), "temp");

// ... (весь остальной код вашего файла остается без изменений) ...

cron.schedule(
  "0 */6 * * *", // Каждые 6 часов
  async () => {
    console.log(
      'CRON JOB: Starting "Featured Songs" generation for all users...'
    );
    try {
      const allUsers = await User.find({}).select("_id");
      for (const user of allUsers) {
        await generateFeaturedSongsForUser(user._id);
      }
      console.log(
        `CRON JOB: "Featured Songs" generation finished for ${allUsers.length} users.`
      );
    } catch (error) {
      console.error('CRON JOB: Error in "Featured Songs" generation:', error);
    }
  },
  {
    scheduled: true,
    timezone: "Europe/Kyiv",
  }
);

cron.schedule(
  "0 2 */3 * *",
  async () => {
    console.log('CRON JOB: Starting "Playlists for You" generation...');
    const allUsers = await User.find({}).select("_id");
    for (const user of allUsers) {
      await generatePlaylistRecommendationsForUser(user._id);
    }
    console.log(`CRON JOB: "Playlists for You" generation finished.`);
  },
  { scheduled: true, timezone: "Europe/Kyiv" }
);
cron.schedule(
  "0 3 * * *",
  async () => {
    console.log('CRON JOB: Starting "New Releases" generation...');
    const allUsers = await User.find({}).select("_id");
    for (const user of allUsers) {
      await generateNewReleasesForUser(user._id);
    }
    console.log(`CRON JOB: "New Releases" generation finished.`);
  },
  { scheduled: true, timezone: "Europe/Kyiv" }
);
cron.schedule(
  "0 5 1 * *",
  async () => {
    console.log('CRON JOB: Starting "On Repeat Rewind" playlist generation...');
    try {
      const allUsers = await User.find({}).select("_id");
      for (const user of allUsers) {
        await generateOnRepeatRewindForUser(user._id);
      }
      console.log(
        `CRON JOB: "On Repeat Rewind" generation finished for ${allUsers.length} users.`
      );
    } catch (error) {
      console.error('CRON JOB: Error in "On Repeat Rewind" generation:', error);
    }
  },
  {
    scheduled: true,
    timezone: "Europe/Kyiv",
  }
);

cron.schedule(
  "0 4 * * 1",
  async () => {
    console.log('CRON JOB: Starting "Discover Weekly" playlist generation...');
    try {
      const allUsers = await User.find({}).select("_id");
      for (const user of allUsers) {
        await generateDiscoverWeeklyForUser(user._id);
      }
      console.log(
        `CRON JOB: "Discover Weekly" generation finished for ${allUsers.length} users.`
      );
    } catch (error) {
      console.error('CRON JOB: Error in "Discover Weekly" generation:', error);
    }
  },
  {
    scheduled: true,
    timezone: "Europe/Kyiv",
  }
);
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

cron.schedule(
  "0 1 * * *",
  () => {
    updateDailyMixes();
  },
  {
    scheduled: true,
    timezone: "Europe/Kyiv",
  }
);

// Запускаем каждый день в 4 часа утра
cron.schedule(
  "0 4 * * *",
  async () => {
    console.log('CRON JOB: Starting "On Repeat" playlist generation...');
    try {
      const eligibleUsers = await ListenHistory.aggregate([
        { $group: { _id: "$user", count: { $sum: 1 } } },
        { $match: { count: { $gte: 30 } } },
      ]);

      for (const user of eligibleUsers) {
        await generateOnRepeatPlaylistForUser(user._id);
      }
      console.log(
        `CRON JOB: "On Repeat" generation finished for ${eligibleUsers.length} users.`
      );
    } catch (error) {
      console.error('CRON JOB: Error in "On Repeat" generation:', error);
    }
  },
  {
    scheduled: true,
    timezone: "Europe/Kyiv",
  }
);

app.use((req, res, next) => {
  req.io = io;
  req.userSockets = userSockets;
  req.userActivities = userActivities;
  next();
});

const jsonParser = express.json();
app.use(jsonParser);

app.use("/api/users", userRoutes);
app.use("/api/images", imageRoutes);

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
app.use("/api/generated-playlists", generatedPlaylistRoutes);
app.use("/api/home", homeRoutes);

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
