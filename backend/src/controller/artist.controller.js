import { Artist } from "../models/artist.model.js";

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
        options: { sort: { playCount: -1 }, limit: 5 }, // <-- ИЗМЕНЕНО: Сортировка по playCount
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
