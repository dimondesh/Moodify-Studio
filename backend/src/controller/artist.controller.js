import { Artist } from "../models/artist.model.js";
import { Album } from "../models/album.model.js";
import { Song } from "../models/song.model.js";

export const getAllArtists = async (req, res, next) => {
  try {
    const artists = await Artist.find();
    res.status(200).json(artists);
  } catch (error) {
    next(error);
  }
};

export const getArtistById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const artist = await Artist.findById(id)
      .populate({
        path: "songs",
        populate: {
          path: "artist",
          select: "name imageUrl",
        },
        options: { sort: { playCount: -1 }, limit: 5 },
      })
      .populate({
        path: "albums",
        populate: {
          path: "artist",
          select: "name imageUrl",
        },
      })
      .lean();

    if (!artist) {
      return res
        .status(404)
        .json({ success: false, message: "Artist not found" });
    }
    res.status(200).json(artist);
  } catch (error) {
    next(error);
  }
};

export const getArtistAppearsOn = async (req, res, next) => {
  try {
    const { id: artistId } = req.params;

    // 1. Находим все альбомы, где артист является основным исполнителем
    const ownAlbums = await Album.find({ artist: artistId })
      .select("_id")
      .lean();
    const ownAlbumIds = ownAlbums.map((album) => album._id);

    // 2. Находим все песни, в записи которых участвовал артист
    const songsWithArtist = await Song.find({ artist: artistId })
      .select("albumId")
      .lean();

    // 3. Собираем уникальные ID всех альбомов из этих песен
    const allAlbumIdsWithArtist = [
      ...new Set(songsWithArtist.map((s) => s.albumId).filter(Boolean)),
    ];

    // 4. Фильтруем, чтобы оставить только те альбомы, которые НЕ являются собственными альбомами артиста
    const appearsOnAlbumIds = allAlbumIdsWithArtist.filter(
      (albumId) => !ownAlbumIds.some((ownId) => ownId.equals(albumId))
    );

    // 5. Находим и возвращаем полные данные этих альбомов
    const albums = await Album.find({ _id: { $in: appearsOnAlbumIds } })
      .populate("artist", "name imageUrl")
      .lean();

    res.status(200).json(albums);
  } catch (error) {
    console.error("Error fetching 'Appears On' albums:", error);
    next(error);
  }
};
