// backend/src/models/listenHistory.model.js

import mongoose from "mongoose";

const listenHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    song: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Song",
      required: true,
    },
    listenedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false } // Отключаем createdAt/updatedAt, так как listenedAt выполняет эту роль
);

// --- ВАЖНЫЕ ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ ---
// Для быстрого поиска истории прослушиваний пользователя
listenHistorySchema.index({ user: 1, listenedAt: -1 });
// Для быстрого подсчета трендов по трекам
listenHistorySchema.index({ song: 1, listenedAt: -1 });

export const ListenHistory = mongoose.model(
  "ListenHistory",
  listenHistorySchema
);
