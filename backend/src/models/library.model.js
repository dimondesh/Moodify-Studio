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
    playlists: [
      {
        playlistId: { type: mongoose.Schema.Types.ObjectId, ref: "Playlist" },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const Library = mongoose.model("Library", librarySchema);
