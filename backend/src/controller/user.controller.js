import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";

// Получение всех пользователей, кроме текущего
export const getAllUsers = async (req, res, next) => {
  try {
    const currentUserMongoId = req.user?.id; // MongoDB _id
    if (!currentUserMongoId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Здесь find({ _id: { $ne: currentUserMongoId } }) корректно работает с MongoDB _id
    const users = await User.find({ _id: { $ne: currentUserMongoId } });

    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};

// Получение сообщений между текущим пользователем и другим
export const getMessages = async (req, res, next) => {
  try {
    const myId = req.user?.id; // Мой MongoDB _id
    const { userId } = req.params; // Это должен быть MongoDB _id другого пользователя

    if (!myId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: myId }, // userId и myId должны быть MongoDB _id
        { senderId: myId, receiverId: userId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
};
