import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";
import { Library } from "../models/library.model.js";
import { firebaseAdmin } from "../lib/firebase.js";
import { RecentSearch } from "../models/recentSearch.model.js";
import mongoose from "mongoose";
import {
  uploadToBunny,
  deleteFromBunny,
  getPathFromUrl,
} from "../lib/bunny.service.js";
import path from "path";

export const getAllUsers = async (req, res, next) => {
  try {
    const currentUserMongoId = req.user?.id;
    if (!currentUserMongoId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const users = await User.find({ _id: { $ne: currentUserMongoId } });

    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const myId = req.user?.id;
    const { userId } = req.params;
    if (!myId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: myId },
        { senderId: myId, receiverId: userId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  res.status(200).json(req.user);
};

export const getUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const profileUser = await User.findById(userId)
      .populate({
        path: "playlists",
        match: { isPublic: true },
        populate: {
          path: "owner",
          model: "User",
          select: "fullName",
        },
        select: "title imageUrl isPublic owner",
      })
      .select("-email -firebaseUid");

    const library = await Library.findOne({ userId: userId }).lean();

    if (!profileUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const profileData = profileUser.toObject();
    profileData.followersCount = profileUser.followers.length;
    profileData.followingUsersCount = profileUser.followingUsers.length;
    profileData.followingArtistsCount = library?.followedArtists?.length || 0;
    profileData.publicPlaylistsCount = profileUser.playlists.length;

    res.status(200).json(profileData);
  } catch (error) {
    next(error);
  }
};

export const getFollowers = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .populate({
        path: "followers",
        select: "fullName imageUrl",
      })
      .select("followers");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const followers = user.followers.map((f) => ({
      _id: f._id,
      name: f.fullName,
      imageUrl: f.imageUrl,
      type: "user",
    }));

    res.status(200).json({ items: followers });
  } catch (error) {
    next(error);
  }
};

export const followUser = async (req, res, next) => {
  try {
    const currentUserMongoId = req.user.id;
    const { userId: userToFollowId } = req.params;

    if (currentUserMongoId.toString() === userToFollowId) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const currentUser = await User.findById(currentUserMongoId);
    const userToFollow = await User.findById(userToFollowId);

    if (!userToFollow) {
      return res.status(404).json({ message: "User to follow not found" });
    }

    const isFollowing = currentUser.followingUsers.includes(userToFollowId);

    if (isFollowing) {
      // Отписаться
      await User.updateOne(
        { _id: currentUserMongoId },
        { $pull: { followingUsers: userToFollowId } }
      );
      await User.updateOne(
        { _id: userToFollowId },
        { $pull: { followers: currentUserMongoId } }
      );
      res.status(200).json({ message: "Unfollowed successfully" });
    } else {
      // Подписаться
      await User.updateOne(
        { _id: currentUserMongoId },
        { $addToSet: { followingUsers: userToFollowId } }
      );
      await User.updateOne(
        { _id: userToFollowId },
        { $addToSet: { followers: currentUserMongoId } }
      );
      res.status(200).json({ message: "Followed successfully" });
    }
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const { fullName } = req.body;
    const userId = req.user.id;
    const firebaseUid = req.user.firebaseUid;
    const currentUser = await User.findById(userId);

    const updateDataMongo = {};
    const updateDataFirebase = {};

    if (fullName) {
      updateDataMongo.fullName = fullName;
      updateDataFirebase.displayName = fullName;
    }

    if (req.files && req.files.imageUrl) {
      if (currentUser.imageUrl) {
        const oldImagePath = getPathFromUrl(currentUser.imageUrl);
        if (oldImagePath) {
          await deleteFromBunny(oldImagePath);
        }
      }

      const file = req.files.imageUrl;
      const fileName = `${userId}_${Date.now()}${path.extname(file.name)}`;
      const result = await uploadToBunny(
        file.tempFilePath,
        "profile_pictures",
        fileName
      );
      updateDataMongo.imageUrl = result.url;
      updateDataFirebase.photoURL = result.url;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateDataMongo, {
      new: true,
    }).select(
      "-email -firebaseUid -followers -followingUsers -followingArtists"
    );

    if (Object.keys(updateDataFirebase).length > 0) {
      await firebaseAdmin.auth().updateUser(firebaseUid, updateDataFirebase);
      console.log(`Firebase user ${firebaseUid} updated.`);
    }

    res
      .status(200)
      .json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    next(error);
  }
};
export const updateUserLanguage = async (req, res, next) => {
  try {
    const { language } = req.body;
    const userId = req.user.id;

    if (!language || !["ru", "uk", "en"].includes(language)) {
      return res.status(400).json({ message: "Invalid language specified" });
    }

    await User.findByIdAndUpdate(userId, { language });

    res.status(200).json({ message: "Language updated successfully" });
  } catch (error) {
    next(error);
  }
};
export const getMutualFollowers = async (req, res, next) => {
  try {
    const currentUserMongoId = req.user.id;
    const currentUser = await User.findById(currentUserMongoId).select(
      "followingUsers"
    );

    if (!currentUser)
      return res.status(404).json({ message: "Current user not found." });

    const followedUsers = await User.find({
      _id: { $in: currentUser.followingUsers },
    }).select("fullName imageUrl followers");

    const mutuals = followedUsers.filter((user) =>
      user.followers.some((followerId) => followerId.equals(currentUserMongoId))
    );

    res.status(200).json({ users: mutuals });
  } catch (error) {
    next(error);
  }
};

export const getFollowing = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate({
        path: "followingUsers",
        select: "fullName imageUrl",
      })
      .select("followingUsers");

    const library = await Library.findOne({ userId })
      .populate({
        path: "followedArtists.artistId",
        model: "Artist",
        select: "name imageUrl",
      })
      .select("followedArtists");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const followingUsers = user.followingUsers.map((u) => ({
      _id: u._id,
      name: u.fullName,
      imageUrl: u.imageUrl,
      type: "user",
    }));

    const followedArtists =
      library?.followedArtists
        .filter((item) => item && item.artistId)
        .map((a) => ({
          _id: a.artistId._id,
          name: a.artistId.name,
          imageUrl: a.artistId.imageUrl,
          type: "artist",
        })) || [];

    const combinedFollowing = [...followingUsers, ...followedArtists];

    res.status(200).json({ items: combinedFollowing });
  } catch (error) {
    console.error("Error in getFollowing:", error);
    next(error);
  }
};

export const getPublicPlaylists = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .populate({
        path: "playlists",
        match: { isPublic: true },
        select: "title imageUrl owner",
      })
      .select("playlists");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const playlists = user.playlists.map((p) => ({
      ...p.toObject(),
      type: "playlist",
    }));

    res.status(200).json({ items: playlists });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCounts = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiverId: currentUserId,
          isRead: false,
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          senderId: "$_id",
          count: "$count",
        },
      },
    ]);

    const countsMap = unreadCounts.reduce((acc, item) => {
      acc[item.senderId] = item.count;
      return acc;
    }, {});

    res.status(200).json(countsMap);
  } catch (error) {
    next(error);
  }
};

export const getRecentSearches = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const searches = await RecentSearch.find({ user: userId })
      .sort("-updatedAt")
      .limit(10)
      .lean();

    const promises = searches.map(async (search) => {
      if (!search.itemType || !search.item) return null;

      const model = mongoose.model(search.itemType);
      let query = model.findById(search.item);

      switch (search.itemType) {
        case "Playlist":
          query = query
            .select("title imageUrl owner")
            .populate("owner", "fullName");
          break;
        case "Album":
          query = query
            .select("title imageUrl artist")
            .populate("artist", "name");
          break;
        case "Artist":
          query = query.select("name imageUrl");
          break;
        case "User":
          query = query.select("fullName imageUrl");
          break;
        case "Mix":
          query = query.select("name imageUrl");
          break;
        case "Song":
          query = query
            .select("title imageUrl artist albumId")
            .populate("artist", "name");
          break;
      }

      const result = await query.lean();
      if (!result) return null;

      return {
        ...result,
        searchId: search._id,
        itemType: search.itemType,
        title: result.title || result.name || result.fullName,
        isTranslatable: search.itemType === "Mix",
      };
    });

    const finalResults = (await Promise.all(promises)).filter(Boolean);

    res.status(200).json(finalResults);
  } catch (error) {
    next(error);
  }
};

export const addRecentSearch = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { itemId, itemType } = req.body;

    if (!itemId || !itemType) {
      return res
        .status(400)
        .json({ message: "itemId and itemType are required" });
    }

    await RecentSearch.findOneAndUpdate(
      { user: userId, item: itemId, itemType: itemType },
      { updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const searches = await RecentSearch.find({ user: userId })
      .sort("-updatedAt")
      .skip(10)
      .select("_id")
      .lean();

    if (searches.length > 0) {
      const idsToDelete = searches.map((s) => s._id);
      await RecentSearch.deleteMany({ _id: { $in: idsToDelete } });
    }

    res.status(201).json({ message: "Recent search added" });
  } catch (error) {
    next(error);
  }
};

export const removeRecentSearch = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { searchId } = req.params;

    const result = await RecentSearch.findOneAndDelete({
      _id: searchId,
      user: userId,
    });

    if (!result) {
      return res.status(404).json({ message: "Search item not found" });
    }

    res.status(200).json({ message: "Recent search removed" });
  } catch (error) {
    next(error);
  }
};

export const clearRecentSearches = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await RecentSearch.deleteMany({ user: userId });
    res.status(200).json({ message: "All recent searches cleared" });
  } catch (error) {
    next(error);
  }
};
