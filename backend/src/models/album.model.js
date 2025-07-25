import mongoose from "mongoose";

const albumSchema = new mongoose.Schema(
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
        required: true, // Каждый альбом должен быть связан хотя бы с одним артистом
      },
    ],
    imageUrl: {
      type: String,
      required: true,
    },
    imagePublicId: {
      type: String,
      // Мы не делаем его required, чтобы не сломать старые записи,
      // но новый код будет его всегда заполнять.
    },
    releaseYear: {
      type: Number,
      required: false,
    },
    type: {
      type: String,
      enum: ["Album", "Single", "EP"],
      default: "Album",
    },
    songs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Song",
        required: false,
      },
    ],
  },
  { timestamps: true }
);

// Добавление индексов
albumSchema.index({ title: 1 });
albumSchema.index({ artist: 1 });

export const Album = mongoose.model("Album", albumSchema);
