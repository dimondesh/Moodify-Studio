import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import cloudinary from "../lib/cloudinary.js";
import * as mm from "music-metadata";

const uploadToCloudinary = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      resource_type: "auto",
      folder: "songs",
    });

    return result.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw new Error("Failed to upload file to Cloudinary");
  }
};

export const createSong = async (req, res, next) => {
  console.log("🚀 Reached /admin/songs route");

  try {
    if (!req.user || !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    if (!req.files || !req.files.audioFile || !req.files.imageFile) {
      return res.status(400).json({ message: "Please upload all files" });
    }

    const { title, artist, albumId, releaseYear } = req.body;
    const audioFile = req.files.audioFile;
    const imageFile = req.files.imageFile;
    console.log(title, artist, albumId, releaseYear);
    console.log(audioFile);
    console.log(imageFile);

    console.log("Audio temp path:", audioFile.tempFilePath);

    let duration = 0;
    try {
      const metadata = await mm.parseFile(audioFile.tempFilePath);
      duration = Math.floor(metadata.format.duration || 0);
    } catch (err) {
      console.error("Error parsing audio metadata:", err);
      throw new Error("Invalid audio file");
    }
    console.log("Uploading audio...");
    const audioUrl = await uploadToCloudinary(audioFile);
    console.log("Audio uploaded:", audioUrl);
    console.log("Uploading image...");

    const imageUrl = await uploadToCloudinary(imageFile);
    console.log("Uploaded image", imageUrl);

    let finalAlbumId = null;

    if (!albumId || albumId === "none" || albumId === "") {
      const newAlbum = new Album({
        title,
        artist,
        imageUrl,
        releaseYear: releaseYear || new Date().getFullYear(),
        songs: [],
        type: "Single",
      });
      await newAlbum.save();
      finalAlbumId = newAlbum._id;
    } else {
      finalAlbumId = albumId;
    }

    const song = new Song({
      title,
      artist,
      audioUrl,
      imageUrl,
      duration,
      albumId: finalAlbumId,
    });

    await song.save();

    if (finalAlbumId) {
      await Album.findByIdAndUpdate(finalAlbumId, {
        $push: { songs: song._id },
      });
    }

    res.status(201).json(song);
  } catch (error) {
    console.log("Error in createSong", error);
    next(error);
  }
};

export const deleteSong = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    const { id } = req.params;
    const song = await Song.findById(id);

    if (song.albumId) {
      await Album.findByIdAndUpdate(song.albumId, {
        $pull: { songs: song._id },
      });
    }
    await Song.findByIdAndDelete(id);
    res
      .status(200)
      .json({ success: true, message: "Song deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const createAlbum = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    console.log("createAlbum body:", req.body);
    console.log("createAlbum files:", req.files);

    const { title, artist, releaseYear, type = "Album" } = req.body;

    if (!req.files || !req.files.imageFile) {
      return res.status(400).json({ message: "No imageFile uploaded" });
    }

    const imageFile = req.files.imageFile;
    const imageUrl = await uploadToCloudinary(imageFile);

    const album = new Album({ title, artist, imageUrl, releaseYear, type });
    await album.save();

    res.status(201).json(album);
  } catch (error) {
    console.error("Error in createAlbum:", error);
    next(error);
  }
};

export const deleteAlbum = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin privileges required." });
    }

    const { id } = req.params;
    await Song.deleteMany({ albumId: id });
    await Album.findByIdAndDelete(id);
    res.status(200).json({ message: "Album deleted successfully" });
  } catch (error) {
    console.log("Error in deleteAlbum", error);
    next(error);
  }
};
