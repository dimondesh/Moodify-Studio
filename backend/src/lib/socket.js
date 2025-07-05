// backend/src/lib/socket.js

import { Server } from "socket.io";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { firebaseAdmin } from "./firebase.js";

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
    // Добавим таймаут для handshake, если проблемы с ним. По умолчанию 45 сек.
    // Если клиент отключается быстро, это может помочь выявить проблему.
    connectTimeout: 10000, // 10 секунд
  });

  const userSockets = new Map(); // Карта: MongoDB_ID -> socket.id
  const userActivities = new Map(); // Карта: MongoDB_ID -> activity

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      const error = new Error("Authentication error: Token required.");
      error.data = { message: "No Firebase ID Token provided." };
      console.error("Socket.IO Auth Error: No token provided.");
      return next(error);
    }

    try {
      // Верификация Firebase ID Token
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
      console.log(
        "Socket.IO Middleware: Firebase ID Token decoded for UID:",
        decodedToken.uid
      );

      // Поиск пользователя в вашей базе данных по Firebase UID
      const user = await User.findOne({ firebaseUid: decodedToken.uid });

      if (!user) {
        const error = new Error("Authentication error: User not found.");
        error.data = {
          message: `User not found in DB for Firebase UID: ${decodedToken.uid}`,
        };
        console.error(
          "Socket.IO Auth Error: User not found in DB for Firebase UID:",
          decodedToken.uid
        );
        return next(error);
      }

      // Прикрепляем MongoDB _id пользователя к объекту сокета
      socket.userId = user._id.toString(); // Преобразуем ObjectId в строку
      console.log(`Socket.IO Middleware: User ${socket.userId} (MongoDB _id) authenticated.`);
      next();
    } catch (error) {
      const authError = new Error("Authentication error: Invalid token.");
      authError.data = { message: error.message }; // Передаем сообщение об ошибке Firebase
      console.error("Socket.IO Auth Error: Invalid token", error.message);
      next(authError);
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId; // Это MongoDB _id, установленный в middleware

    // Проверяем, что userId существует. Middleware должен гарантировать это,
    // но на всякий случай для большей надежности.
    if (!userId) {
      console.error(
        "Socket connection established without a valid userId. Disconnecting."
      );
      socket.disconnect(true);
      return;
    }

    // Добавляем пользователя в мапы
    userSockets.set(userId, socket.id);
    userActivities.set(userId, "Idle");

    // Оповещаем всех, что новый пользователь подключился
    io.emit("user_connected", userId);

    // Отправляем текущему сокету списки онлайн-пользователей и их активностей
    // Убедимся, что это отправляется после того, как userId добавлен
    socket.emit("users_online", Array.from(userSockets.keys()));
    socket.emit("activities", Array.from(userActivities.entries()));

    console.log(`User ${userId} (MongoDB _id) connected via Socket.IO`);

    socket.on("update_activity", ({ activity }) => {
      userActivities.set(userId, activity);
      io.emit("activity_updated", { userId, activity });
    });

    socket.on("send_message", async (data) => {
      try {
        const { receiverId, content } = data;
        const senderId = userId; // senderId - это MongoDB _id текущего пользователя

        // Проверяем, что receiverId и content присутствуют
        if (!receiverId || !content) {
          console.error("send_message error: receiverId or content missing.");
          socket.emit("message_error", "Receiver ID or message content missing.");
          return;
        }

        const message = await Message.create({
          senderId,
          receiverId,
          content,
        });

        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive_message", message);
        } else {
          console.log(`Receiver ${receiverId} not online to receive message.`);
          // Можно добавить логику для сохранения сообщения как непрочитанного
        }

        socket.emit("message_sent", message);
      } catch (error) {
        console.error("Message error:", error);
        socket.emit("message_error", error.message);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`User ${userId} (MongoDB _id) disconnected from Socket.IO. Reason: ${reason}`);

      // Удаляем пользователя из мап
      if (userSockets.has(userId)) {
        userSockets.delete(userId);
        userActivities.delete(userId);
        io.emit("user_disconnected", userId);
      }
    });
  });
};