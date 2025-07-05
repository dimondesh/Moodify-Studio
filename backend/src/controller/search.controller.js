import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";

export const searchSongs = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.json({ songs: [], albums: [] });
    }

    const regex = new RegExp(q.trim(), "i");

    const songsRaw = await Song.find({
      $or: [{ title: regex }, { artist: regex }],
    })
      .limit(50)
      .lean();

    const albumsRaw = await Album.find({
      $or: [{ title: regex }, { artist: regex }],
    })
      .limit(50)
      .lean();

    const songs = songsRaw.map((song) => ({
      ...song,
      albumId: song.albumId ? song.albumId.toString() : null,
      _id: song._id.toString(),
    }));

    const albums = albumsRaw.map((album) => ({
      ...album,
      _id: album._id.toString(),
    }));

    return res.json({ songs, albums });
  } catch (error) {
    next(error);
  }
};
