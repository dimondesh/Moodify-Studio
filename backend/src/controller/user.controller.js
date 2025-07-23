import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary"; // Для загрузки фото

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
// backend/src/controller/user.controller.js

// --- НОВЫЕ КОНТРОЛЛЕРЫ ---

export const getUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const profileUser = await User.findById(userId)
      .populate({
        path: "playlists",
        match: { isPublic: true }, // Показываем только публичные плейлисты
        select: "title imageUrl isPublic",
      })
      .select("-email -firebaseUid"); // Не отдаем чувствительные данные

    if (!profileUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Добавим счетчики
    const profileData = profileUser.toObject();
    profileData.followersCount = profileUser.followers.length;
    profileData.followingUsersCount = profileUser.followingUsers.length;
    profileData.followingArtistsCount = profileUser.followingArtists.length;
    profileData.publicPlaylistsCount = profileUser.playlists.length;

    res.status(200).json(profileData);
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

    const updateData = {};
    if (fullName) {
      updateData.fullName = fullName;
    }

    if (req.files && req.files.imageUrl) {
      const file = req.files.imageUrl;
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "profile_pictures",
        public_id: `${userId}_${Date.now()}`,
      });
      updateData.imageUrl = result.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    res
      .status(200)
      .json({ message: "Profile updated successfully", user: updatedUser });
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

    // Находим пользователей, на которых подписан текущий юзер
    const followedUsers = await User.find({
      _id: { $in: currentUser.followingUsers },
    }).select("fullName imageUrl followers");

    // Фильтруем, чтобы оставить только тех, кто подписан в ответ
    const mutuals = followedUsers.filter((user) =>
      user.followers.some((followerId) => followerId.equals(currentUserMongoId))
    );

    res.status(200).json({ users: mutuals });
  } catch (error) {
    next(error);
  }
};
