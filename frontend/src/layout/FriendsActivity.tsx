import { HeadphonesIcon, Music, Users } from "lucide-react";
import { useChatStore } from "../stores/useChatStore";
import { useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { ScrollArea } from "../components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";

const FriendsActivity = () => {
  const { users, fetchUsers, onlineUsers, userActivities } = useChatStore();
  const [user, loadingUser, authError] = useAuthState(auth); // Получаем состояние пользователя

  useEffect(() => {
    // 💡 ИСПРАВЛЕНО: Вызываем fetchUsers только если пользователь аутентифицирован и не в процессе загрузки
    if (user && !loadingUser) {
      fetchUsers();
    }
  }, [fetchUsers, user, loadingUser]); // Добавили loadingUser в зависимости

  return (
    <div className="h-full bg-zinc-900 rounded-lg flex flex-col">
      <div className="p-4 flex justify-between items-center border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Users className="size-5 shrink-0" />
          <h2 className="font-semibold">What they're listening to</h2>
        </div>
      </div>

      {loadingUser ? ( // Показываем скелетон, пока Firebase user загружается
        <div className="flex-1 flex items-center justify-center">
          <HeadphonesIcon className="size-8 animate-pulse text-zinc-500" />
        </div>
      ) : authError ? (
        <p className="text-red-500 p-4">Authentication error.</p>
      ) : !user ? (
        <LoginPrompt />
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {users.map((userObj) => {
              const activity = userActivities.get(userObj.firebaseUid);
              const isPlaying = activity && activity !== "Idle";

              return (
                <div
                  key={userObj._id}
                  className="cursor-pointer hover:bg-zinc-800/50 p-3 rounded-md transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="size-10 border border-zinc-800">
                        <AvatarImage
                          src={userObj.imageUrl}
                          alt={userObj.fullName}
                        />
                        <AvatarFallback>{userObj.fullName[0]}</AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-zinc-900 ${
                          onlineUsers.has(userObj.firebaseUid)
                            ? "bg-green-500"
                            : "bg-zinc-500"
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-white">
                          {userObj.fullName}
                        </span>
                        {isPlaying && (
                          <Music className="size-3.5 text-violet-400 shrink-0" />
                        )}
                      </div>
                      {isPlaying ? (
                        <div className="">
                          <div className=" text-sm text-white font-medium truncate">
                            {activity.split("   ")[0]}
                          </div>
                          <div className="text-xs text-zinc-400 truncate">
                            {activity.split("   ")[1]}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-zinc-400">Idle</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default FriendsActivity;

const LoginPrompt = () => (
  <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
    <div className="relative">
      <div
        className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full blur-lg
       opacity-75 animate-pulse"
        aria-hidden="true"
      />
      <div className="relative bg-zinc-900 rounded-full p-4">
        <HeadphonesIcon className="size-8 text-emerald-400" />
      </div>
    </div>

    <div className="space-y-2 max-w-[250px]">
      <h3 className="text-lg font-semibold text-white">
        See What Friends Are Playing
      </h3>
      <p className="text-sm text-zinc-400">
        Login to discover what music your friends are enjoying right now
      </p>
    </div>
  </div>
);
