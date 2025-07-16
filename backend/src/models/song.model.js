import mongoose from "mongoose";

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    artist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Artist",
        required: true,
      },
    ],
    albumId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Album",
      default: null, // Может быть синглом без альбома
    },
    imageUrl: {
      type: String,
      required: true,
    },
    instrumentalUrl: {
      type: String,
      required: true,
    },
    vocalsUrl: {
      type: String,
      default: null,
    },
    duration: {
      type: Number, // Длительность в секундах
      required: true,
    },
    playCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // --- НОВОЕ ПОЛЕ: lyrics ---
    lyrics: {
      type: String, // Для хранения LRC-текста
      default: null,
    },
    // -------------------------
  },
  { timestamps: true }
);

// Добавление индексов для оптимизации поиска
songSchema.index({ title: 1 });
songSchema.index({ artist: 1 });
songSchema.index({ albumId: 1 });
songSchema.index({ playCount: -1 }); // Индекс для сортировки по популярности

export const Song = mongoose.model("Song", songSchema);
