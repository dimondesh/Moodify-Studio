import { Server } from "socket.io";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { Song } from "../models/song.model.js";
import { Artist } from "../models/artist.model.js";
import { firebaseAdmin } from "./firebase.js";

export const initializeSocket = (server) => {
  const allowedOrigin = process.env.CLIENT_ORIGIN_URL;

  const io = new Server(server, {
    cors: {
      origin: allowedOrigin,
      credentials: true,
    },
    connectTimeout: 10000,
  });

  const userSockets = new Map();
  const userActivities = new Map();

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      const error = new Error("Authentication error: Token required.");
      error.data = { message: "No Firebase ID Token provided." };
      console.error("Socket.IO Auth Error: No token provided.");
      return next(error);
    }

    try {
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
      console.log(
        "Socket.IO Middleware: Firebase ID Token decoded for UID:",
        decodedToken.uid
      );

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

      socket.userId = user._id.toString();
      console.log(
        `Socket.IO Middleware: User ${socket.userId} (MongoDB _id) authenticated.`
      );
      next();
    } catch (error) {
      const authError = new Error("Authentication error: Invalid token.");
      authError.data = { message: error.message };
      console.error("Socket.IO Auth Error: Invalid token", error.message);
      next(authError);
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    if (!userId) {
      console.error(
        "Socket connection established without a valid userId. Disconnecting."
      );
      socket.disconnect(true);
      return;
    }

    userSockets.set(userId, socket.id);
    userActivities.set(userId, "Idle"); // Изначально пользователь неактивен

    io.emit("user_connected", userId);

    io.emit("users_online", Array.from(userSockets.keys()));
    // При новом подключении отправляем все текущие активности
    io.emit("activities", Array.from(userActivities.entries()));

    console.log(`User ${userId} (MongoDB _id) connected via Socket.IO`);

    socket.on("update_activity", async ({ songId }) => {
      console.log(
        `[Socket] Received update_activity for userId: ${userId}, songId: ${songId}`
      );
      let activityString = "Idle"; // По умолчанию "Idle"

      if (songId) {
        try {
          // Находим песню и заполняем информацию об артисте
          const song = await Song.findById(songId).populate({
            path: "artist",
            model: "Artist",
            select: "name",
          });

          console.log(
            `[Socket] Song found: ${song ? song.title : "None"}, Artist data:`,
            song ? song.artist : "None"
          );

          if (song && song.artist) {
            let artistNames;
            if (Array.isArray(song.artist)) {
              artistNames = song.artist.map((a) => a.name).join(", ");
            } else if (
              song.artist &&
              typeof song.artist === "object" &&
              "name" in song.artist
            ) {
              artistNames = song.artist.name;
            } else {
              console.warn(
                `[Socket] Unexpected artist format for song ${song.title}:`,
                song.artist
              );
              artistNames = "Unknown Artist";
            }
            activityString = `${song.title}   ${artistNames}`;
            console.log(`[Socket] Formatted activity: ${activityString}`);
          } else if (song) {
            activityString = `${song.title}   Unknown Artist`; // Если артист не найден, но песня есть
            console.log(
              `[Socket] Formatted activity (no artist): ${activityString}`
            );
          }
        } catch (error) {
          console.error(
            "Ошибка при получении данных песни для активности:",
            error
          );
          activityString = "Unknown Activity (Error)";
        }
      } else {
        // Если songId не пришел (пользователь поставил на паузу, перестал слушать и т.д.)
        activityString = "Idle";
      }

      userActivities.set(userId, activityString);
      io.emit("activity_updated", { userId, activity: activityString });
      console.log(
        `[Socket] Emitting activity_updated: ${userId}, ${activityString}`
      );
    });

    socket.on("send_message", async (data) => {
      try {
        const { receiverId, content, type, shareDetails } = data; 

        const senderId = userId;

        if (!receiverId || !content) {
          console.error("send_message error: receiverId or content missing.");
          socket.emit(
            "message_error",
            "Receiver ID or message content missing."
          );
          return;
        }
        // --- ПРОВЕРКА НА ВЗАИМНУЮ ПОДПИСКУ ---
        const sender = await User.findById(senderId)
          .select("followingUsers")
          .lean();
        const receiver = await User.findById(receiverId)
          .select("followingUsers")
          .lean();

        if (!sender || !receiver) {
          socket.emit("message_error", "User not found.");
          return;
        }

        const senderFollowsReceiver = sender.followingUsers.some((id) =>
          id.equals(receiverId)
        );
        const receiverFollowsSender = receiver.followingUsers.some((id) =>
          id.equals(senderId)
        );

        if (!senderFollowsReceiver || !receiverFollowsSender) {
          console.log(
            `Message blocked: User ${senderId} and ${receiverId} are not mutual followers.`
          );
          socket.emit(
            "message_error",
            "You can only message mutual followers."
          );
          return;
        }

        const messageData = {
          senderId,
          receiverId,
          content,
          type: type || "text",
        };

        if (type === "share" && shareDetails) {
          messageData.shareDetails = {
            entityType: shareDetails.entityType,
            entityId: shareDetails.entityId,
          };
        }

        const message = await Message.create(messageData);
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive_message", message);
        } else {
          console.log(`Receiver ${receiverId} not online to receive message.`);
        }

        socket.emit("message_sent", message);
      } catch (error) {
        console.error("Message error:", error);
        socket.emit("message_error", error.message);
      }
    });
    socket.on("typing_started", ({ receiverId }) => {
      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing_started", { senderId: userId });
      }
    });

    // Когда пользователь прекращает печатать
    socket.on("typing_stopped", ({ receiverId }) => {
      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing_stopped", { senderId: userId });
      }
    });

    // Когда пользователь открывает чат и читает сообщения
    socket.on("mark_messages_as_read", async ({ chatPartnerId }) => {
      try {
        await Message.updateMany(
          { senderId: chatPartnerId, receiverId: userId, isRead: false },
          { $set: { isRead: true } }
        );

        // Уведомляем отправителя, что его сообщения прочитаны
        const senderSocketId = userSockets.get(chatPartnerId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("messages_marked_read", {
            chatPartnerId: userId, // Сообщаем, в каком чате произошли изменения
          });
        }
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(
        `User ${userId} (MongoDB _id) disconnected from Socket.IO. Reason: ${reason}`
      );

      if (userSockets.has(userId)) {
        userSockets.delete(userId);
        userActivities.delete(userId); // Удаляем активность при отключении
        io.emit("user_disconnected", userId);
      }
    });
  });
};
