// src/Providers/AuthProvider.tsx

import React, { useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuthStore } from "../stores/useAuthStore";
import { useChatStore } from "../stores/useChatStore";
import { Card, CardContent } from "../components/ui/card";
import { Loader } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [firebaseChecked, setFirebaseChecked] = useState(false);
  const { t } = useTranslation();

  const { user, setUser, fetchUser, logout } = useAuthStore();
  const { initSocket, disconnectSocket, isConnected } = useChatStore();
  const { i18n } = useTranslation();

  const socketInitializedRef = useRef(false);
  useEffect(() => {
    if (user?.language && user.language !== i18n.language) {
      console.log(
        `AuthProvider: Setting language from user profile to '${user.language}'`
      );
      i18n.changeLanguage(user.language);
    }
  }, [user, i18n]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log(
          "AuthProvider: Firebase user detected:",
          firebaseUser.uid,
          firebaseUser.email
        );

        // --- ИЗМЕНЕНИЕ НАЧАЛО: Проверка верификации email ---
        const isEmailPasswordProvider = firebaseUser.providerData.some(
          (p) => p.providerId === "password"
        );
        if (isEmailPasswordProvider && !firebaseUser.emailVerified) {
          toast.error("Please verify your email before logging in.", {
            duration: 5000,
          });
          logout();
          setFirebaseChecked(true);
          return; // Прерываем дальнейшую обработку
        }
        // --- ИЗМЕНЕНИЕ КОНЕЦ ---

        if (!useAuthStore.getState().user && navigator.onLine) {
          console.log(
            "AuthProvider: Online and no user in state. Syncing user with backend..."
          );
          try {
            await fetchUser(firebaseUser.uid);
            console.log("AuthProvider: MongoDB user synced successfully.");
          } catch (error) {
            console.error(
              "AuthProvider: Error syncing Firebase user with MongoDB:",
              error
            );

            logout();
          }
        } else if (useAuthStore.getState().user) {
          console.log("AuthProvider: User already in state. No sync needed.");
        } else {
          console.log("AuthProvider: Offline. Trusting persisted user state.");
        }
      } else {
        if (useAuthStore.getState().user) {
          console.log(
            "AuthProvider: No Firebase user, but user was in state. Clearing user state."
          );
          setUser(null);
          socketInitializedRef.current = false;
          disconnectSocket();
        } else {
          console.log(
            "AuthProvider: No Firebase user and no user in state. Nothing to do."
          );
        }
      }
      setFirebaseChecked(true);
    });

    return () => unsubscribe();
  }, [setUser, fetchUser, logout, disconnectSocket]);

  useEffect(() => {
    if (
      firebaseChecked &&
      user &&
      user.id &&
      !socketInitializedRef.current &&
      !isConnected
    ) {
      console.log(
        "AuthProvider: Initializing Socket.IO with MongoDB User ID:",
        user.id
      );
      initSocket(user.id);
      socketInitializedRef.current = true;
    } else if (firebaseChecked && !user && isConnected) {
      console.log(
        "AuthProvider: User logged out after Firebase check, disconnecting socket."
      );
      disconnectSocket();
      socketInitializedRef.current = false;
    }
  }, [user, initSocket, disconnectSocket, isConnected, firebaseChecked]);

  const { error: chatError } = useChatStore();
  useEffect(() => {
    if (chatError) {
      if (
        chatError.includes("io client disconnect") ||
        chatError.includes("transport close")
      ) {
        console.info(
          "AuthProvider Chat Socket Info: Socket intentionally disconnected or closed."
        );
      } else {
        console.error("AuthProvider Chat Socket Error:", chatError);
      }
    }
  }, [chatError]);

  if (!firebaseChecked) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center">
        <Card className="w-[90%] max-w-md bg-zinc-900 border-zinc-800">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <Loader className="size-6 text-violet-500 animate-spin" />
            <h3 className="text-zinc-400 text-xl font-bold">
              {t("auth.loggingIn")}
            </h3>
            <p className="text-zinc-400 text-sm">{t("auth.redirecting")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthProvider;
