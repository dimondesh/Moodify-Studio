import { Server } from "socket.io";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js"; // Импортируем модель User
import { firebaseAdmin } from "./firebase.js"; // Импортируем Firebase Admin SDK

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  });

  const userSockets = new Map(); // Карта: MongoDB_ID -> socket.id
  const userActivities = new Map(); // Карта: MongoDB_ID -> activity

  // Socket.IO Middleware для аутентификации
  io.use(async (socket, next) => {
    // Клиент должен передавать Firebase ID Token в socket.handshake.auth.token
    const token = socket.handshake.auth.token;

    if (!token) {
      console.error("Socket.IO Auth Error: No token provided");
      return next(new Error("Authentication error: Token required"));
    }

    try {
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
      // Найдем пользователя в нашей базе данных по Firebase UID
      const user = await User.findOne({ firebaseUid: decodedToken.uid });

      if (!user) {
        console.error(
          "Socket.IO Auth Error: User not found in DB for Firebase UID:",
          decodedToken.uid
        );
        return next(new Error("Authentication error: User not found"));
      }

      // Прикрепляем MongoDB _id пользователя к объекту сокета
      // Это крайне важно! Теперь socket.userId будет содержать MongoDB _id
      socket.userId = user._id.toString(); // Преобразуем ObjectId в строку
      console.log(`Socket connected for user (MongoDB _id): ${socket.userId}`);
      next();
    } catch (error) {
      console.error("Socket.IO Auth Error: Invalid token", error.message);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    // После успешной аутентификации через middleware, socket.userId уже доступен
    const userId = socket.userId; // Это MongoDB _id

    // Добавляем пользователя в мапы
    userSockets.set(userId, socket.id);
    userActivities.set(userId, "Idle"); // Устанавливаем статус по умолчанию

    // Оповещаем всех, что новый пользователь подключился
    io.emit("user_connected", userId);

    // Отправляем текущему сокету списки онлайн-пользователей и их активностей
    socket.emit("users_online", Array.from(userSockets.keys()));
    socket.emit("activities", Array.from(userActivities.entries()));

    console.log(`User ${userId} (MongoDB _id) connected via Socket.IO`);

    socket.on("update_activity", ({ activity }) => {
      // userId уже берется из socket.userId, который установлен в middleware
      userActivities.set(userId, activity);
      io.emit("activity_updated", { userId, activity });
    });

    socket.on("send_message", async (data) => {
      try {
        const { receiverId, content } = data; // senderId уже известен из socket.userId
        const senderId = userId; // senderId - это MongoDB _id текущего пользователя

        const message = await Message.create({
          senderId,
          receiverId,
          content,
        });

        const receiverSocketId = userSockets.get(receiverId); // receiverId - это MongoDB _id
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive_message", message);
        }

        // Отправляем отправителю подтверждение, что сообщение было отправлено
        socket.emit("message_sent", message);
      } catch (error) {
        console.error("Message error:", error);
        socket.emit("message_error", error.message);
      }
    });

    socket.on("disconnect", () => {
      console.log(`User ${userId} (MongoDB _id) disconnected from Socket.IO`);

      // Удаляем пользователя из мап
      userSockets.delete(userId);
      userActivities.delete(userId);

      // Оповещаем всех, что пользователь отключился
      io.emit("user_disconnected", userId);
    });
  });
};
