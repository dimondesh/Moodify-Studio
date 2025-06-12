import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import cloudinary from "../lib/cloudinary.js";

const uploadToCloudinary = async (file) => {
    try {
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
            resource_type: "auto",
            folder: "songs"
        });
        return result.secure_url;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        throw new Error("Failed to upload file to Cloudinary");
    }
}



export const checkAdmin = (req, res, next) => {
    res.status(200).json({admin: true });

}

export const createSong = async (req, res, next) => {
    try {
        if (!req.file || !req.files.audioFile || !req.files.imageFile) {
            return res.status(400).json({ message: "Please upload all files" });
        }
        const { title, artist, albumId, duration } = req.body;
        const audioFile = req.files.audioFile;
        const imageFile = req.files.imageFile;

        const audioUrl = await uploadToCloudinary(audioFile);

        const song = await Song.create({
            title,
            artist,
            imageUrl: imageFile.path,
            audioUrl: audioFile.path,
            duration,
            albumId: albumId || null
        });
        await song.save();

        if (albumId) {
            const album = await Album.findByIdAndUpdate(albumId, {
                $push: { songs: song._id }
            }


            );
            return res.status(201).json({ success: true, song });
        }
    } catch (error) {
        next(error);
    }
}

export const deleteSong = async (req, res, next) => {
    try {
        const { id } = req.params;
        const song = await Song.findById(id);

        if (song.albumId) {
            await Album.findByIdAndUpdate(song.albumId, {
                $pull: { songs: song._id }
            });
        }
        await Song.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Song deleted successfully" });
    } catch (error) {
        next(error);
    }
}

export const createAlbum = async (req, res, next) => {
    try {
        const { title, artist, releaseDate } = req.body;
        const imageFile = req.file;

        const imageUrl = await uploadToCloudinary(imageFile);
        const album = await Album.create({
            title,
            artist,
            imageUrl,
            releaseDate: new Date(releaseDate).getTime(),
        });
        await album.save();
        res.status(201).json({ success: true, album });
    } catch (error) {
        next(error);
    }
}

export const deleteAlbum = async (req, res, next) => {
    try {
        const { id } = req.params;
        await Song.deleteMany({ albumId: id });
        await Album.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Album deleted successfully" });
    }
    catch (error) {
        next(error);
    }
}