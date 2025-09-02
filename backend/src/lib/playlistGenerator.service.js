// backend/src/lib/playlistGenerator.service.js
import mongoose from "mongoose";
import { ListenHistory } from "../models/listenHistory.model.js";
import { GeneratedPlaylist } from "../models/generatedPlaylist.model.js";
import { Song } from "../models/song.model.js";

const ON_REPEAT_SONG_COUNT = 30;
const ON_REPEAT_IMAGE_URL = "https://moodify.b-cdn.net/on-repeat.png";

export const generateOnRepeatPlaylistForUser = async (userId) => {
  console.log(`Generating 'On Repeat' playlist for user: ${userId}`);

  const listenHistory = await ListenHistory.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$song", listenCount: { $sum: 1 } } },
    { $sort: { listenCount: -1 } },
    { $limit: ON_REPEAT_SONG_COUNT },
  ]);

  if (listenHistory.length === 0) {
    // Если истории нет, можно удалить старый плейлист, если он был
    await GeneratedPlaylist.deleteOne({ user: userId, type: "ON_REPEAT" });
    console.log(
      `No listen history for user ${userId}. Deleting old 'On Repeat' if it exists.`
    );
    return null;
  }

  const songIds = listenHistory.map((item) => item._id);

  const onRepeatPlaylist = await GeneratedPlaylist.findOneAndUpdate(
    { user: userId, type: "ON_REPEAT" },
    {
      $set: {
        songs: songIds,
        nameKey: "generatedPlaylists.onRepeat.title",
        descriptionKey: "generatedPlaylists.onRepeat.description",
        imageUrl: ON_REPEAT_IMAGE_URL,
        generatedOn: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  console.log(
    `'On Repeat' playlist processed for user ${userId} with ${songIds.length} songs.`
  );
  return onRepeatPlaylist;
};
