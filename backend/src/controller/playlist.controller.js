import { Playlist } from "../models/playlist.model.js";
import { User } from "../models/user.model.js";
import { Song } from "../models/song.model.js";
import { Library } from "../models/library.model.js";

import cloudinary from "../lib/cloudinary.js";

const uploadImageToCloudinary = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      resource_type: "image",
      folder: "playlist_covers",
    });
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw new Error("Failed to upload image file to Cloudinary");
  }
};

export const createPlaylist = async (req, res, next) => {
  try {
    const { title, description, isPublic } = req.body;
    const ownerId = req.user.id;

    if (!title) {
      return res.status(400).json({ message: "Playlist title is required" });
    }

    let imageUrl =
      "https://res.cloudinary.com/dzbf3cpwm/image/upload/v1755425854/default-album-cover_qhwd4c.png";
    if (req.files && req.files.image) {
      imageUrl = await uploadImageToCloudinary(req.files.image);
    }

    const playlist = new Playlist({
      title,
      description,
      imageUrl,
      owner: ownerId,
      isPublic: isPublic === "true",
      songs: [],
    });

    await playlist.save();

    await User.findByIdAndUpdate(ownerId, {
      $push: { playlists: playlist._id },
    });

    res.status(201).json(playlist);
  } catch (error) {
    console.error("Error in createPlaylist:", error);
    next(error);
  }
};

export const getMyPlaylists = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const createdPlaylists = await Playlist.find({ owner: userId })
      .populate("owner", "fullName imageUrl")
      .populate({
        path: "songs",
        populate: {
          path: "artist",
          model: "Artist",
          select: "name imageUrl",
        },
      })
      .lean();

    const userLibrary = await Library.findOne({ userId })
      .populate({
        path: "playlists.playlistId",
        model: "Playlist",
        populate: [
          {
            path: "owner",
            select: "fullName imageUrl",
          },
          {
            path: "songs",
            populate: {
              path: "artist",
              model: "Artist",
              select: "name imageUrl",
            },
          },
        ],
      })
      .lean();

    const addedPlaylists = userLibrary
      ? userLibrary.playlists
          .filter((item) => item.playlistId)
          .map((item) => ({
            ...item.playlistId,
            addedAt: item.addedAt,
          }))
      : [];

    const combinedPlaylistsMap = new Map();

    createdPlaylists.forEach((p) => {
      combinedPlaylistsMap.set(p._id.toString(), p);
    });

    addedPlaylists.forEach((p) => {
      combinedPlaylistsMap.set(p._id.toString(), p);
    });

    const allMyPlaylists = Array.from(combinedPlaylistsMap.values());

    res.status(200).json(allMyPlaylists);
  } catch (error) {
    console.error("Error in getMyPlaylists:", error);
    next(error);
  }
};

export const getPlaylistById = async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const playlist = await Playlist.findById(playlistId)
      .populate("owner", "fullName imageUrl")
      .populate({
        path: "songs",
        populate: {
          path: "artist",
          model: "Artist",
          select: "name imageUrl",
        },
      })
      .lean();

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    if (
      !playlist.isPublic &&
      playlist.owner._id.toString() !== req.user.id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Access denied. This is a private playlist." });
    }

    res.status(200).json(playlist);
  } catch (error) {
    console.error("Error in getPlaylistById:", error);
    next(error);
  }
};

export const updatePlaylist = async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const { title, description, isPublic } = req.body;

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    if (playlist.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        message: "Access denied. You are not the owner of this playlist.",
      });
    }

    if (title) playlist.title = title;
    if (description) playlist.description = description;
    if (isPublic !== undefined) playlist.isPublic = isPublic === "true";

    if (req.files && req.files.image) {
      playlist.imageUrl = await uploadImageToCloudinary(req.files.image);
    }

    await playlist.save();
    console.log(
      `[SOCKET EMIT] Sending 'playlist_updated' to room 'playlist-${playlistId}' after updating details.`
    );

    req.io
      .to(`playlist-${playlistId}`)
      .emit("playlist_updated", { playlistId });

    const updatedPlaylist = await Playlist.findById(playlistId).lean();
    req.io
      .to(`playlist-${playlistId}`)
      .emit("playlist_updated", { playlist: updatedPlaylist });

    res.status(200).json(playlist);
  } catch (error) {
    console.error("Error in updatePlaylist:", error);
    next(error);
  }
};

export const deletePlaylist = async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    if (playlist.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        message: "Access denied. You are not the owner of this playlist.",
      });
    }

    await Playlist.findByIdAndDelete(playlistId);
    await User.findByIdAndUpdate(playlist.owner, {
      $pull: { playlists: playlist._id },
    });
    req.io
      .to(`playlist-${playlistId}`)
      .emit("playlist_deleted", { playlistId });

    res.status(200).json({ message: "Playlist deleted successfully" });
  } catch (error) {
    console.error("Error in deletePlaylist:", error);
    next(error);
  }
};

export const addSongToPlaylist = async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const { songId } = req.body;

    const playlist = await Playlist.findById(playlistId);
    const song = await Song.findById(songId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }
    if (!song) {
      return res.status(404).json({ message: "Song not found" });
    }

    if (playlist.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        message: "Access denied. You are not the owner of this playlist.",
      });
    }

    if (playlist.songs.includes(songId)) {
      return res.status(400).json({ message: "Song already in playlist" });
    }

    playlist.songs.push(songId);
    await playlist.save();

    const updatedPlaylist = await Playlist.findById(playlistId)
      .populate("owner", "fullName imageUrl")
      .populate({
        path: "songs",
        populate: { path: "artist", model: "Artist", select: "name imageUrl" },
      })
      .lean();
    console.log(
      `[SOCKET EMIT] Sending 'playlist_updated' to room 'playlist-${playlistId}' after adding a song.`
    );
    req.io
      .to(`playlist-${playlistId}`)
      .emit("playlist_updated", { playlist: updatedPlaylist });

    res.status(200).json({ message: "Song added to playlist", playlist });
  } catch (error) {
    console.error("Error in addSongToPlaylist:", error);
    next(error);
  }
};

export const removeSongFromPlaylist = async (req, res, next) => {
  try {
    const { playlistId, songId } = req.params;

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    if (playlist.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        message: "Access denied. You are not the owner of this playlist.",
      });
    }

    const initialSongCount = playlist.songs.length;
    playlist.songs = playlist.songs.filter(
      (song) => song.toString() !== songId
    );

    if (playlist.songs.length === initialSongCount) {
      return res.status(404).json({ message: "Song not found in playlist" });
    }

    await playlist.save();
    const updatedPlaylist = await Playlist.findById(playlistId)
      .populate("owner", "fullName imageUrl")
      .populate({
        path: "songs",
        populate: { path: "artist", model: "Artist", select: "name imageUrl" },
      })
      .lean();
    console.log(
      `[BACKEND] Emitting 'playlist_updated' to room 'playlist-${playlistId}' after removing a song. New song count: ${updatedPlaylist.songs.length}`
    );
    console.log(
      `[SOCKET EMIT] Sending 'playlist_updated' to room 'playlist-${playlistId}' after removing a song.`
    );
    req.io
      .to(`playlist-${playlistId}`)
      .emit("playlist_updated", { playlist: updatedPlaylist });
    res.status(200).json({ message: "Song removed from playlist", playlist });
  } catch (error) {
    console.error("Error in removeSongFromPlaylist:", error);
    next(error);
  }
};

export const likePlaylist = async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const userId = req.user.id;

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    if (playlist.likes.includes(userId)) {
      return res
        .status(400)
        .json({ message: "Playlist already liked by this user" });
    }

    playlist.likes.push(userId);
    await playlist.save();

    res.status(200).json({ message: "Playlist liked successfully", playlist });
  } catch (error) {
    console.error("Error in likePlaylist:", error);
    next(error);
  }
};

export const unlikePlaylist = async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const userId = req.user.id;

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    const initialLikeCount = playlist.likes.length;
    playlist.likes = playlist.likes.filter((id) => id.toString() !== userId);

    if (playlist.likes.length === initialLikeCount) {
      return res
        .status(400)
        .json({ message: "Playlist was not liked by this user" });
    }

    await playlist.save();

    res
      .status(200)
      .json({ message: "Playlist unliked successfully", playlist });
  } catch (error) {
    console.error("Error in unlikePlaylist:", error);
    next(error);
  }
};

export const getPublicPlaylists = async (req, res, next) => {
  try {
    const publicPlaylists = await Playlist.find({ isPublic: true })
      .populate("owner", "fullName imageUrl")
      .populate({
        path: "songs",
        populate: {
          path: "artist",
          model: "Artist",
          select: "name imageUrl",
        },
      })
      .lean();
    res.status(200).json(publicPlaylists);
  } catch (error) {
    console.error("Error in getPublicPlaylists:", error);
    next(error);
  }
};
