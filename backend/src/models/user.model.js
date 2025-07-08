import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: String,
    imageUrl: String,
    email: { type: String, required: true },
    firebaseUid: { type: String, required: true, unique: true },
    playlists: [
      // Добавляем новое поле для плейлистов
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Playlist",
      },
    ],
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
