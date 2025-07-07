import React, { useEffect, useState, useRef } from "react"; // Импортируем useRef
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuthStore } from "../stores/useAuthStore";
import { useChatStore } from "../stores/useChatStore";
import { Card, CardContent } from "../components/ui/card";
import { Loader } from "lucide-react";

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [firebaseChecked, setFirebaseChecked] = useState(false);

  const { user, setUser, fetchUser, logout } = useAuthStore();
  const { initSocket, disconnectSocket, isConnected } = useChatStore();

  const socketInitializedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log(
          "AuthProvider: Firebase user detected:",
          firebaseUser.uid,
          firebaseUser.email
        );
        try {
          await fetchUser(firebaseUser.uid);
          console.log("AuthProvider: MongoDB user synced.");
        } catch (error) {
          console.error(
            "AuthProvider: Error syncing Firebase user with MongoDB:",
            error
          );
          logout();
        }
      } else {
        console.log("AuthProvider: No Firebase user is signed in.");
        setUser(null);
        socketInitializedRef.current = false;
        disconnectSocket();
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
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <Card className="w-[90%] max-w-md bg-zinc-900 border-zinc-800">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <Loader className="size-6 text-violet-500 animate-spin" />
            <h3 className="text-zinc-400 text-xl font-bold">Logging you in</h3>
            <p className="text-zinc-400 text-sm">Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthProvider;
