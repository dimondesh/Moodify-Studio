import { useEffect } from "react";
import { useChatStore } from "../../stores/useChatStore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../lib/firebase";
import UsersList from "./UsersList";
import ChatHeader from "./ChatHeader";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Avatar, AvatarImage } from "../../components/ui/avatar";
import MessageInput from "./MessageInput";
import { useAuthStore } from "../../stores/useAuthStore"; // Импортируем useAuthStore

const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const ChatPage = () => {
  const [firebaseUser] = useAuthState(auth); // Firebase user
  const { user: mongoUser } = useAuthStore(); // MongoDB user from your store
  const { messages, selectedUser, fetchUsers, fetchMessages } = useChatStore();

  useEffect(() => {
    // 💡 ИСПРАВЛЕНО: Вызываем fetchUsers только когда MongoDB user доступен
    if (mongoUser) {
      fetchUsers();
    }
  }, [fetchUsers, mongoUser]);

  useEffect(() => {
    // 💡 ИСПРАВЛЕНО: Передаем MongoDB _id для fetchMessages
    if (selectedUser && mongoUser) {
      fetchMessages(selectedUser._id);
    }
  }, [selectedUser, fetchMessages, mongoUser]);

  return (
    <main className="h-full rounded-lg bg-gradient-to-b from-zinc-800 to-zinc-900 overflow-hidden">
      <div className="grid lg:grid-cols-[300px_1fr] grid-cols-[80px_1fr] h-[calc(100vh-180px)]">
        <UsersList />

        <div className="flex flex-col h-full">
          {selectedUser ? (
            <>
              <ChatHeader />
              <ScrollArea className="h-[calc(100vh-340px)]">
                <div className="p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message._id}
                      className={`flex items-start gap-3 ${
                        // 💡 ИСПРАВЛЕНО: Сравниваем по MongoDB _id
                        message.senderId === mongoUser?.id
                          ? "flex-row-reverse"
                          : ""
                      }`}
                    >
                      <Avatar className="size-8">
                        <AvatarImage
                          src={
                            // 💡 ИСПРАВЛЕНО: Используем photoURL из FirebaseUser для текущего,
                            // imageUrl из selectedUser для другого
                            message.senderId === mongoUser?.id
                              ? firebaseUser?.photoURL || undefined
                              : selectedUser.imageUrl
                          }
                        />
                      </Avatar>

                      <div
                        className={`rounded-lg p-3 max-w-[70%] ${
                          // 💡 ИСПРАВЛЕНО: Сравниваем по MongoDB _id
                          message.senderId === mongoUser?.id
                            ? "bg-green-500"
                            : "bg-zinc-800"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <span className="text-sm text-zinc-300 mt-1 block">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <MessageInput />
            </>
          ) : (
            <NoConversationPlaceholder />
          )}
        </div>
      </div>
    </main>
  );
};

export default ChatPage;

const NoConversationPlaceholder = () => (
  <div className="flex flex-col items-center justify-center h-full space-y-6">
    <img src="/Moodify.png" alt="Moodify" className="size-16 animate-bounce" />
    <div className="text-center">
      <h3 className="text-zinc-300 text-lg font-medium mb-1">
        No conversation selected
      </h3>
      <p className="text-zinc-500 text-sm">Choose a friend to start chatting</p>
    </div>
  </div>
);
