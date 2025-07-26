import mongoose from "mongoose";

const librarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // У каждого пользователя может быть только одна библиотека
    },
    likedSongs: [
      {
        songId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Song",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    savedMixes: [
      {
        mixId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Mix", // Прямая ссылка на модель Mix
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    albums: [
      {
        albumId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Album",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    playlists: [
      {
        playlistId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Playlist",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    followedArtists: [
      // <-- НОВОЕ ПОЛЕ: для отслеживания подписанных артистов
      {
        artistId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Artist",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

export const Library = mongoose.model("Library", librarySchema);
