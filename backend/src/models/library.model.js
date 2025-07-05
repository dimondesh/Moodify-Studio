import mongoose from "mongoose";

const librarySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
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
    // плейлисты и артисты позже
  },
  { timestamps: true }
);

export const Library = mongoose.model("Library", librarySchema);
