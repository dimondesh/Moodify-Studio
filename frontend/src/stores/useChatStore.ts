/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type { Message, User } from "../types";
import { useAuthStore } from "./useAuthStore";

import { io } from "socket.io-client";
import { auth } from "../lib/firebase"; // Импортируем auth для получения Firebase ID Token

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

  initSocket: (userId: string) => Promise<void>; // Теперь возвращает Promise
  disconnectSocket: () => void;
  sendMessage: (receiverId: string, senderId: string, content: string) => void;
  fetchMessages: (userId: string) => Promise<void>;
  setSelectedUser: (user: User | null) => void;
}

const baseURL = "http://localhost:5000";

const socket = io(baseURL, {
  autoConnect: false,
  auth: {}, // Будет заполнено в initSocket
  withCredentials: true,
});

// Переменная для отслеживания, были ли слушатели уже зарегистрированы
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
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/users");
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
      console.warn("initSocket called without a valid MongoDB User ID.");
      return; // Не пытаемся подключиться без ID
    }
    if (get().isConnected) {
      console.log("Socket already connected for user:", mongoDbUserId);
      return; // Если уже подключен, ничего не делаем
    }
    if (!auth.currentUser) {
      console.warn("initSocket called but no Firebase user is logged in.");
      return; // Не пытаемся подключиться без Firebase пользователя
    }

    try {
      const idToken = await auth.currentUser.getIdToken();
      socket.auth = { token: idToken };

      // Регистрируем слушателей только один раз
      if (!listenersRegistered) {
        console.log("Registering Socket.IO listeners...");
        socket.on("connect", () => {
          set({ isConnected: true, error: null });
          console.log(
            "Socket connected, emitting user_connected:",
            mongoDbUserId
          );
          socket.emit("user_connected", mongoDbUserId);
        });

        socket.on("connect_error", (err: any) => {
          console.error(
            "Socket connection error:",
            err.message,
            err.description
          );
          set({
            isConnected: false,
            error: `Socket connection failed: ${err.message}`,
          });
        });

        socket.on("disconnect", (reason: string) => {
          console.log("Socket disconnected:", reason);
          set({
            isConnected: false,
            onlineUsers: new Set(),
            userActivities: new Map(),
            error: `Socket disconnected: ${reason}`,
          });
        });

        socket.on("users_online", (users: string[]) => {
          set({ onlineUsers: new Set(users) });
        });

        socket.on("activities", (activities: [string, string][]) => {
          set({ userActivities: new Map(activities) });
        });

        socket.on("user_connected", (userId: string) => {
          set((state) => ({
            onlineUsers: new Set([...state.onlineUsers, userId]),
          }));
        });

        socket.on("user_disconnected", (userId: string) => {
          set((state) => {
            const newOnlineUsers = new Set(state.onlineUsers);
            newOnlineUsers.delete(userId);
            return { onlineUsers: newOnlineUsers };
          });
        });

        socket.on("receive_message", (message: Message) => {
          set((state) => ({
            messages: [...state.messages, message],
          }));
        });

        socket.on("message_sent", (message: Message) => {
          // Если сообщение было только что отправлено, оно уже может быть в messages.
          // Добавьте логику, чтобы избежать дублирования, если это событие - подтверждение.
          // Например, можно проверять, нет ли уже сообщения с таким _id
          const currentMessages = get().messages;
          if (!currentMessages.some((m) => m._id === message._id)) {
            set((state) => ({
              messages: [...state.messages, message],
            }));
          }
        });

        socket.on("activity_updated", ({ userId, activity }) => {
          set((state) => {
            const newActivities = new Map(state.userActivities);
            newActivities.set(userId, activity);
            return { userActivities: newActivities };
          });
        });

        listenersRegistered = true;
      }

      // Подключаем сокет
      socket.connect();
      console.log("Attempting to connect socket...");
    } catch (error: any) {
      console.error(
        "Error getting Firebase ID Token or connecting Socket.IO:",
        error
      );
      set({ error: `Socket.IO init failed: ${error.message}` });
    }
  },

  disconnectSocket: () => {
    if (get().isConnected) {
      console.log("Disconnecting socket...");
      socket.disconnect();
      set({
        isConnected: false,
        onlineUsers: new Set(),
        userActivities: new Map(),
      });
      // Не удаляем слушателей здесь, так как они должны быть постоянными.
      // Они будут отработаны при переподключении.
    }
  },

  sendMessage: (receiverId, senderId, content) => {
    const currentSocket = get().socket;
    // 💡 ИСПРАВЛЕНО: Добавлена проверка на isConnected перед отправкой
    if (!currentSocket || !get().isConnected) {
      console.error("Socket not connected for sending message. Cannot send.");
      set({ error: "Cannot send message: Socket not connected." });
      return;
    }
    currentSocket.emit("send_message", { receiverId, senderId, content });
  },

  fetchMessages: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get(`/users/messages/${userId}`);
      set({ messages: response.data });
    } catch (error: any) {
      console.error("Failed to fetch messages:", error);
      set({
        error: error.response?.data?.message || "Failed to fetch messages",
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));
