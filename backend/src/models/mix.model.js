import mongoose from "mongoose";

const mixSchema = new mongoose.Schema(
  {
    name: {
      // Например, "Rock Mix" или "Sad Mix"
      type: String,
      required: true,
    },
    type: {
      // Чтобы на фронте разделить секции
      type: String,
      enum: ["Genre", "Mood"],
      required: true,
    },
    // Название исходного жанра/настроения для отображения
    sourceName: {
      type: String,
      required: true,
    },
    songs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Song",
      },
    ],
    // URL обложки (будет URL картинки первого артиста в миксе)
    imageUrl: {
      type: String,
      required: true,
    },
    // Поле для проверки "свежести" микса. Храним только дату.
    generatedOn: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

mixSchema.index({ generatedOn: 1, type: 1 });

export const Mix = mongoose.model("Mix", mixSchema);
