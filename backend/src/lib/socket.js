import { Server } from "socket.io";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { firebaseAdmin } from "./firebase.js";

export const initializeSocket = (server) => {
  let allowedOrigin;
  if (process.env.NODE_ENV === "production")
    allowedOrigin = "https://moodify-ruddy.vercel.app";
  else allowedOrigin = "http://localhost:5173";

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
    userActivities.set(userId, "Idle");

    io.emit("user_connected", userId);

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
        const senderId = userId;
        if (!receiverId || !content) {
          console.error("send_message error: receiverId or content missing.");
          socket.emit(
            "message_error",
            "Receiver ID or message content missing."
          );
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
        }

        socket.emit("message_sent", message);
      } catch (error) {
        console.error("Message error:", error);
        socket.emit("message_error", error.message);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(
        `User ${userId} (MongoDB _id) disconnected from Socket.IO. Reason: ${reason}`
      );

      if (userSockets.has(userId)) {
        userSockets.delete(userId);
        userActivities.delete(userId);
        io.emit("user_disconnected", userId);
      }
    });
  });
};
