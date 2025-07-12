import mongoose from "mongoose";

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    // Изменено: теперь это массив ссылок на модель Artist
    artist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Artist",
        required: true, // Каждый трек должен быть связан хотя бы с одним артистом
      },
    ],
    imageUrl: {
      type: String,
      required: true,
    },
    audioUrl: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    albumId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Album",
      required: false,
    },
  },
  { timestamps: true }
);

// Добавление индексов
songSchema.index({ title: 1 });
songSchema.index({ artist: 1 });
songSchema.index({ albumId: 1 });

export const Song = mongoose.model("Song", songSchema);
