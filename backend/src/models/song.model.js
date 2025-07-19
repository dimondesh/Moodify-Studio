// backend/src/models/song.model.js
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
    // --- НОВЫЕ ПОЛЯ ДЛЯ PUBLIC_ID ---
    imagePublicId: {
      // Добавим для консистентности, если вы захотите управлять обложками песен
      type: String,
      default: null,
    },
    // -------------------------------
    instrumentalUrl: {
      type: String,
      required: true,
    },
    instrumentalPublicId: {
      // <-- ДОБАВЛЕНО
      type: String,
      required: true, // Считаем обязательным, если есть URL
      default: null,
    },

    vocalsUrl: {
      type: String,
      default: null,
    },
    vocalsPublicId: {
      // <-- ДОБАВЛЕНО
      type: String,
      default: null, // Необязательно, если vocalsUrl null
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
    lyrics: {
      type: String, // Для хранения LRC-текста
      default: null,
    },
  },
  { timestamps: true }
);

// Добавление индексов для оптимизации поиска
songSchema.index({ title: 1 });
songSchema.index({ artist: 1 });
songSchema.index({ albumId: 1 });
songSchema.index({ playCount: -1 }); // Индекс для сортировки по популярности

export const Song = mongoose.model("Song", songSchema);
