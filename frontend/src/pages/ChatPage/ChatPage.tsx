import React, { useEffect, useState, useRef } from "react";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Button } from "../../components/ui/button";
import { Users as UsersIcon } from "lucide-react";
import { useChatStore } from "../../stores/useChatStore";
import { useAuthStore } from "../../stores/useAuthStore";
import type { User } from "../../types";
import UsersList from "./UsersList";
import ChatHeader from "./ChatHeader";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "../../components/ui/sheet";
import { Avatar, AvatarImage } from "../../components/ui/avatar";
import MessageInput from "./MessageInput";

const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const ChatPage = () => {
  const { user: mongoUser } = useAuthStore();
  const {
    users,
    messages,
    selectedUser,
    fetchUsers,
    initSocket,
    sendMessage,
    fetchMessages,
    setSelectedUser,
    isConnected,
    onlineUsers,
    userActivities,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageContent, setMessageContent] = useState("");

  useEffect(() => {
    console.log("ChatPage Mount/Update. Current State:");
    console.log("  mongoUser:", mongoUser);
    console.log("  selectedUser:", selectedUser);
    console.log("  messages length:", messages.length);
    console.log("  isConnected:", isConnected);
  }, [mongoUser, selectedUser, messages.length, isConnected]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (messageContent.trim() && selectedUser && mongoUser) {
      await sendMessage(selectedUser._id, mongoUser.id, messageContent);
      setMessageContent("");
      setTimeout(scrollToBottom, 100);
    } else {
      console.warn(
        "Failed to send message: Missing selectedUser, mongoUser, or empty content."
      );
      console.log({
        messageContent,
        selectedUser,
        mongoUserExists: !!mongoUser,
        mongoUserId: mongoUser?.id,
      });
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (mongoUser && mongoUser.id && !isConnected) {
      console.log("ChatPage: Initializing socket for user:", mongoUser.id);
      initSocket(mongoUser.id);
    }

    if (mongoUser && mongoUser.id && !users.length) {
      console.log("ChatPage: Fetching users.");
      fetchUsers();
    }
    return () => {};
  }, [mongoUser, initSocket, fetchUsers, isConnected, users.length]);

  useEffect(() => {
    if (selectedUser && mongoUser && mongoUser.id) {
      console.log(`ChatPage: Fetching messages for ${selectedUser.fullName}.`);
      fetchMessages(selectedUser._id);
    } else {
      console.log(
        "ChatPage: Not fetching messages (selectedUser or mongoUser/mongoUser.id missing).",
        {
          selectedUser,
          mongoUserExists: !!mongoUser,
          mongoUserId: mongoUser?.id,
        }
      );
    }
  }, [selectedUser, fetchMessages, mongoUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setIsSidebarOpen(false);
  };

  const handleBackToList = () => {
    setSelectedUser(null);
    setIsSidebarOpen(true);
  };

  return (
    <main className="h-full rounded-lg bg-gradient-to-b from-zinc-800 to-zinc-900 overflow-hidden">
      {/* Десктопная версия (lg и выше) */}
      <div className="hidden lg:grid lg:grid-cols-[300px_1fr] h-[calc(100vh-180px)]">
        <UsersList
          onUserSelect={handleUserSelect}
          selectedUser={selectedUser}
          onlineUsers={onlineUsers}
          userActivities={userActivities}
        />

        <div className="flex flex-col h-full border-l border-zinc-800">
          {selectedUser ? (
            <>
              <ChatHeader />
              <ScrollArea className="overflow-y-auto h-[calc(100vh-340px)]">
                <div className="p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-zinc-400 mt-8">
                      <p>Start chatting with {selectedUser.fullName}!</p>
                      <p className="text-sm">No messages yet.</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message._id}
                        className={`flex items-start gap-3 ${
                          message.senderId === mongoUser?.id
                            ? "flex-row-reverse"
                            : ""
                        }`}
                      >
                        <Avatar className="size-8 flex-shrink-0">
                          <AvatarImage
                            src={
                              message.senderId === mongoUser?.id
                                ? mongoUser?.imageUrl || "/default-avatar.png"
                                : users.find((u) => u._id === message.senderId)
                                    ?.imageUrl || "/default-avatar.png"
                            }
                          />
                        </Avatar>

                        <div
                          className={`rounded-lg p-3 max-w-[70%] ${
                            message.senderId === mongoUser?.id
                              ? "bg-violet-600 text-white"
                              : "bg-zinc-800 text-white"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <span className="text-xs text-zinc-400 mt-1 block text-right">
                            {formatTime(message.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <MessageInput
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onSend={handleSendMessage}
                selectedUser={selectedUser}
                currentUserId={mongoUser?.id || ""}
              />
            </>
          ) : (
            <NoConversationPlaceholder />
          )}
        </div>
      </div>

      {/* Мобильная версия (sm и md экраны) */}
      <div className="lg:hidden h-[calc(100vh-180px)] flex flex-col">
        {selectedUser ? (
          <div className="flex flex-col h-full">
            <ChatHeader showBackButton={true} onBack={handleBackToList} />
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-zinc-400 mt-8">
                    <p>Start chatting with {selectedUser.fullName}!</p>
                    <p className="text-sm">No messages yet.</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message._id}
                      className={`flex items-start gap-3 ${
                        message.senderId === mongoUser?.id
                          ? "flex-row-reverse"
                          : ""
                      }`}
                    >
                      <Avatar className="size-8 flex-shrink-0">
                        <AvatarImage
                          src={
                            message.senderId === mongoUser?.id
                              ? mongoUser?.imageUrl || "/default-avatar.png"
                              : users.find((u) => u._id === message.senderId)
                                  ?.imageUrl || "/default-avatar.png"
                          }
                        />
                      </Avatar>

                      <div
                        className={`rounded-lg p-3 max-w-[70%] ${
                          message.senderId === mongoUser?.id
                            ? "bg-violet-600 text-white"
                            : "bg-zinc-800 text-white"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <span className="text-xs text-zinc-400 mt-1 block text-right">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <MessageInput
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onSend={handleSendMessage}
              selectedUser={selectedUser}
              currentUserId={mongoUser?.id || ""}
            />
          </div>
        ) : (
          <div className="flex flex-col h-full items-center justify-center p-4">
            <NoConversationPlaceholder />
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button className="mt-8 bg-violet-600 hover:bg-violet-700 mb-10">
                  <UsersIcon className="mr-2 h-4 w-4" /> View Users
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[300px] sm:w-[350px] p-0 bg-zinc-950 border-r border-zinc-800 text-white"
              >
                <SheetTitle className="sr-only">Users List</SheetTitle>
                <SheetDescription className="sr-only">
                  List of users for chat.
                </SheetDescription>
                <UsersList
                  onUserSelect={handleUserSelect}
                  selectedUser={selectedUser}
                  onlineUsers={onlineUsers}
                  userActivities={userActivities}
                />
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    </main>
  );
};

export default ChatPage;

const NoConversationPlaceholder = () => (
  <div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
    <img src="/Moodify.png" alt="Moodify" className="size-16 animate-bounce" />
    <div className="text-center">
      <h3 className="text-zinc-300 text-lg font-medium mb-1">
        No conversation selected
      </h3>
      <p className="text-zinc-500 text-sm">Choose a friend to start chatting</p>
    </div>
  </div>
);
