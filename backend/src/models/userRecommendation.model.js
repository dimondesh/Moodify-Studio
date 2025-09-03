import mongoose from "mongoose";

const userRecommendationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["NEW_RELEASE", "PLAYLIST_FOR_YOU"],
    required: true,
  },
  items: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Album", // В данном случае, ссылаемся на альбомы
    },
  ],
  generatedAt: { type: Date, default: Date.now },
});

userRecommendationSchema.index({ user: 1, type: 1 });

export const UserRecommendation = mongoose.model(
  "UserRecommendation",
  userRecommendationSchema
);
