// frontend/src/stores/useChatStore.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type { Message, User } from "../types";

import { io } from "socket.io-client";
import { auth } from "../lib/firebase"; // Импортируем auth для получения Firebase ID Token
import { useAuthStore } from "./useAuthStore"; // <-- ИМПОРТИРУЕМ useAuthStore

interface ChatStore {
  users: User[];
  isLoading: boolean;
  error: string | null;
  socket: any;
  isConnected: boolean;
  onlineUsers: Set<string>;
  userActivities: Map<string, string>;
  messages: Message[];
  selectedUser: User | null;

  fetchUsers: () => Promise<void>;

  initSocket: (mongoDbUserId: string) => Promise<void>;
  disconnectSocket: () => void;
  sendMessage: (receiverId: string, senderId: string, content: string) => void;
  fetchMessages: (userId: string) => Promise<void>;
  setSelectedUser: (user: User | null) => void;
}

const baseURL = "http://localhost:5001";

// Важно: socket не должен автоматически подключаться
const socket = io(baseURL, {
  autoConnect: false,
  auth: {}, // Будет заполнено в initSocket
  withCredentials: true,
  // Добавим reconnectionAttempts и reconnectionDelay для большей устойчивости
  reconnectionAttempts: 5,
  reconnectionDelay: 1000, // 1 секунда
});

let listenersRegistered = false;

export const useChatStore = create<ChatStore>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,
  socket: socket,
  isConnected: false,
  onlineUsers: new Set(),
  userActivities: new Map(),
  messages: [],
  selectedUser: null,

  setSelectedUser: (user) => set({ selectedUser: user }),

  fetchUsers: async () => {
    // 💡 ДОБАВЛЕНО: Получаем текущего пользователя из useAuthStore
    const { user: authUser } = useAuthStore.getState();
    if (!authUser || !authUser.id) {
      console.warn(
        "fetchUsers: No authenticated user or user ID available. Skipping fetch."
      );
      set({
        isLoading: false,
        error: "Authentication required to fetch users.",
      });
      return; // Выходим, если пользователя нет
    }

    set({ isLoading: true, error: null });
    try {
      // Здесь также нужно получить токен Firebase, так как axiosInstance не делает это автоматически
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error(
          "No Firebase user is logged in to get ID token for fetching users."
        );
      }
      const token = await currentUser.getIdToken();

      const response = await axiosInstance.get("/users", {
        headers: { Authorization: `Bearer ${token}` }, // Передаем токен
      });
      set({
        users: Array.isArray(response.data)
          ? response.data
          : response.data.users || [],
      });
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
      set({ error: error.response?.data?.message || "Failed to fetch users" });
    } finally {
      set({ isLoading: false });
    }
  },

  initSocket: async (mongoDbUserId: string) => {
    if (!mongoDbUserId) {
      console.warn(
        "initSocket: MongoDB User ID is missing or invalid. Cannot initialize socket."
      );
      set({ error: "Socket.IO init failed: MongoDB User ID is missing." });
      return;
    }

    if (get().isConnected) {
      console.log(
        "initSocket: Socket already connected for user:",
        mongoDbUserId
      );
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn(
        "initSocket: No Firebase user is logged in. Cannot get ID token."
      );
      set({ error: "Socket.IO init failed: No Firebase user logged in." });
      return;
    }

    try {
      const idToken = await currentUser.getIdToken(true);
      socket.auth = { token: idToken };
      console.log(
        "initSocket: Firebase ID Token obtained, setting socket.auth."
      );

      if (!listenersRegistered) {
        console.log("initSocket: Registering Socket.IO listeners...");
        socket.on("connect", () => {
          set({ isConnected: true, error: null });
          console.log(
            "Socket.IO: 'connect' event - Socket connected. Emitting 'user_connected'."
          );
          socket.emit("user_connected", mongoDbUserId); // Используем переданный ID
        });

        socket.on("connect_error", (err: any) => {
          console.error(
            "Socket.IO: 'connect_error' event - Connection error:",
            err.message,
            err.data?.message || ""
          );
          set({
            isConnected: false,
            error: `Socket connection failed: ${err.message}. Details: ${
              err.data?.message || "N/A"
            }`,
          });
        });

        socket.on("disconnect", (reason: string) => {
          console.log(
            "Socket.IO: 'disconnect' event - Socket disconnected. Reason:",
            reason
          );
          set({
            isConnected: false,
            onlineUsers: new Set(),
            userActivities: new Map(),
            error: `Socket disconnected: ${reason}`,
          });
        });

        socket.on("users_online", (users: string[]) => {
          console.log(
            "Socket.IO: 'users_online' event - Received online users:",
            users
          );
          set({ onlineUsers: new Set(users) });
        });

        socket.on("activities", (activities: [string, string][]) => {
          console.log(
            "Socket.IO: 'activities' event - Received activities:",
            activities
          );
          set({ userActivities: new Map(activities) });
        });

        socket.on("user_connected", (userId: string) => {
          console.log(
            "Socket.IO: 'user_connected' event - User connected:",
            userId
          );
          set((state) => ({
            onlineUsers: new Set([...state.onlineUsers, userId]),
          }));
        });

        socket.on("user_disconnected", (userId: string) => {
          console.log(
            "Socket.IO: 'user_disconnected' event - User disconnected:",
            userId
          );
          set((state) => {
            const newOnlineUsers = new Set(state.onlineUsers);
            newOnlineUsers.delete(userId);
            return { onlineUsers: newOnlineUsers };
          });
        });

        socket.on("receive_message", (message: Message) => {
          console.log(
            "Socket.IO: 'receive_message' event - Received message:",
            message
          );
          set((state) => ({
            messages: [...state.messages, message],
          }));
        });

        socket.on("message_sent", (message: Message) => {
          console.log(
            "Socket.IO: 'message_sent' event - Message sent confirmation:",
            message
          );
          const currentMessages = get().messages;
          if (!currentMessages.some((m) => m._id === message._id)) {
            set((state) => ({
              messages: [...state.messages, message],
            }));
          }
        });

        socket.on("activity_updated", ({ userId, activity }) => {
          console.log(
            `Socket.IO: 'activity_updated' event - User ${userId} activity updated to ${activity}`
          );
          set((state) => {
            const newActivities = new Map(state.userActivities);
            newActivities.set(userId, activity);
            return { userActivities: newActivities };
          });
        });

        listenersRegistered = true;
      }

      console.log("initSocket: Attempting to connect socket...");
      socket.connect();
    } catch (error: any) {
      console.error(
        "initSocket: Error getting Firebase ID Token or connecting Socket.IO:",
        error
      );
      set({ error: `Socket.IO init failed: ${error.message}` });
    }
  },

  disconnectSocket: () => {
    if (get().isConnected) {
      console.log("disconnectSocket: Disconnecting socket...");
      socket.disconnect();
      set({
        isConnected: false,
        onlineUsers: new Set(),
        userActivities: new Map(),
      });
    } else {
      console.log("disconnectSocket: Socket is not connected.");
    }
  },

  sendMessage: (receiverId, senderId, content) => {
    const currentSocket = get().socket;
    if (!currentSocket || !get().isConnected) {
      console.error(
        "sendMessage: Socket not connected for sending message. Cannot send."
      );
      set({ error: "Cannot send message: Socket not connected." });
      return;
    }
    console.log(
      `sendMessage: Emitting 'send_message' to ${receiverId} from ${senderId}...`
    );
    currentSocket.emit("send_message", { receiverId, senderId, content });
  },

  fetchMessages: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      // 💡 Здесь тоже нужно получить токен Firebase
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error(
          "No Firebase user is logged in to get ID token for fetching messages."
        );
      }
      const token = await currentUser.getIdToken();

      const response = await axiosInstance.get(`/users/messages/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }, // Передаем токен
      });
      set({ messages: response.data });
    } catch (error: any) {
      console.error("fetchMessages: Failed to fetch messages:", error);
      set({
        error: error.response?.data?.message || "Failed to fetch messages",
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));
