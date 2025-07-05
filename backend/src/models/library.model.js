// backend/models/Library.js (или Library.ts)

import mongoose from "mongoose";

const librarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    songs: [
      {
        songId: { type: mongoose.Schema.Types.ObjectId, ref: "Song" },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    albums: [
      {
        albumId: { type: mongoose.Schema.Types.ObjectId, ref: "Album" },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    // --- ОБНОВЛЕННОЕ ПОЛЕ ДЛЯ ЛАЙКОВ ---
    likedSongs: [
      {
        // Теперь это массив объектов
        songId: {
          // ID песни
          type: mongoose.Schema.Types.ObjectId,
          ref: "Song",
          required: true,
        },
        addedAt: {
          // Когда эта песня была лайкнута пользователем
          type: Date,
          default: Date.now,
        },
      },
    ],
    // плейлисты и артисты позже
  },
  { timestamps: true }
);

export const Library = mongoose.model("Library", librarySchema);
