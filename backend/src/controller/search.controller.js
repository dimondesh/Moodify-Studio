import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import { Playlist } from "../models/playlist.model.js";
import { Artist } from "../models/artist.model.js";

export const searchSongs = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.json({ songs: [], albums: [], playlists: [], artists: [] });
    }

    const regex = new RegExp(q.trim(), "i");

    const matchingArtists = await Artist.find({ name: regex }).limit(50).lean();
    const matchingArtistIds = matchingArtists.map((artist) => artist._id);

    const [songsRaw, albumsRaw, playlistsRaw] = await Promise.all([
      Song.find({
        $or: [{ title: regex }, { artist: { $in: matchingArtistIds } }],
      })
        .populate("artist", "name imageUrl") // <-- ИЗМЕНЕНО: Заполняем артиста полным объектом
        .populate("albumId", "title imageUrl")
        .limit(50)
        .lean(),

      Album.find({
        $or: [{ title: regex }, { artist: { $in: matchingArtistIds } }],
      })
        .populate("artist", "name imageUrl") // <-- ИЗМЕНЕНО: Заполняем артиста полным объектом
        .limit(50)
        .lean(),

      Playlist.find({
        isPublic: true,
        $or: [{ title: regex }, { description: regex }],
      })
        .populate("owner", "fullName")
        .limit(50)
        .lean(),
    ]);

    const songs = songsRaw.map((song) => ({
      ...song,
      // artist теперь уже популирован, поэтому просто используем его
      // artists: song.artist ? song.artist.map((a) => a.name) : [], // <-- УДАЛЕНО: Больше не преобразуем в массив имен
      albumId: song.albumId ? song.albumId._id.toString() : null,
      albumTitle: song.albumId ? song.albumId.title : null,
      albumImageUrl: song.albumId ? song.albumId.imageUrl : null,
      _id: song._id.toString(),
    }));

    const albums = albumsRaw.map((album) => ({
      ...album,
      // artist теперь уже популирован, поэтому просто используем его
      // artist: album.artist ? album.artist.map((a) => a.name) : [], // <-- УДАЛЕНО: Больше не преобразуем в массив имен
      _id: album._id.toString(),
    }));

    const playlists = playlistsRaw.map((playlist) => ({
      ...playlist,
      _id: playlist._id.toString(),
      owner: playlist.owner
        ? {
            _id: playlist.owner._id.toString(),
            fullName: playlist.owner.fullName,
          }
        : null,
      songs: playlist.songs ? playlist.songs.map((s) => s.toString()) : [],
    }));

    const artists = matchingArtists.map((artist) => ({
      ...artist,
      _id: artist._id.toString(),
    }));

    return res.json({ songs, albums, playlists, artists });
  } catch (error) {
    console.error("Search controller error:", error);
    next(error);
  }
};
