import mongoose from "mongoose";

const artistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      required: false,
      default: "",
    },
    bannerUrl: {
      type: String,
      required: false,
      default: null,
    },
    songs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Song",
      },
    ],
    albums: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Album",
      },
    ],
    // Можно добавить другие поля, например, количество прослушиваний, жанры и т.д.
  },
  { timestamps: true }
);

// Добавление индекса
artistSchema.index({ name: 1 });

export const Artist = mongoose.model("Artist", artistSchema);
