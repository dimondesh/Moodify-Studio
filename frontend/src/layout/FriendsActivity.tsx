import { HeadphonesIcon, Music, Users } from "lucide-react";
import { useChatStore } from "../stores/useChatStore";
import { useEffect } from "react";
import { ScrollArea } from "../components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { useAuthStore } from "../stores/useAuthStore";
const FriendsActivity = () => {
  const { users, fetchUsers, onlineUsers, userActivities } = useChatStore();
  const { user: authUser, isLoading: loadingAuthUser } = useAuthStore();
  useEffect(() => {
    if (authUser && authUser.id && !loadingAuthUser) {
      fetchUsers();
    }
  }, [fetchUsers, authUser, loadingAuthUser]);

  if (loadingAuthUser) {
    return (
      <div className="h-full bg-zinc-900 rounded-lg flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <HeadphonesIcon className="size-8 animate-pulse text-zinc-500" />
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="h-full bg-zinc-900 rounded-lg flex flex-col">
        <LoginPrompt />
      </div>
    );
  }

  const activeUsers = users.filter(
    (userObj) => userObj._id !== authUser.id && onlineUsers.has(userObj._id)
  );

  return (
    <div className="h-full bg-zinc-900 rounded-lg flex flex-col">
      <div className="p-4 sm:p-3 md:p-4 flex justify-between items-center border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Users className="size-5 shrink-0" />
          <h2 className="font-semibold text-base sm:text-sm md:text-base">
            What they're listening to
          </h2>
        </div>
      </div>

      <ScrollArea className="flex-1 pr-2 -mr-2">
        {" "}
        {/* Добавляем для стилизации скроллбара */}
        <div className="p-4 sm:p-3 md:p-4 space-y-4">
          {activeUsers.length === 0 ? (
            <p className="text-zinc-400 text-center text-sm p-4">
              No active friends found. <br /> Connect with friends or wait for
              them to come online!
            </p>
          ) : (
            activeUsers.map((userObj) => {
              const isOnline = onlineUsers.has(userObj._id);
              const activity = userActivities.get(userObj._id);
              const isPlaying = activity && activity !== "Idle";

              let songTitle = "";
              let artistName = "";
              if (isPlaying) {
                const parts = activity.split("   ");
                songTitle = parts[0] || "";
                artistName = parts[1] || "";
              }

              return (
                <div
                  key={userObj._id}
                  className="cursor-pointer hover:bg-zinc-800/50 p-3 rounded-md transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      {" "}
                      {/* Добавляем flex-shrink-0 */}
                      <Avatar className="size-10 border border-zinc-800">
                        <AvatarImage
                          src={userObj.imageUrl || "/default-avatar.png"}
                          alt={userObj.fullName}
                        />
                        <AvatarFallback>
                          {userObj.fullName?.[0] || "U"}
                        </AvatarFallback>{" "}
                        {/* Fallback для первой буквы */}
                      </Avatar>
                      <div
                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-zinc-900 ${
                          isOnline ? "bg-green-500" : "bg-zinc-500"
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      {" "}
                      {/* min-w-0 для truncate */}
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-white truncate">
                          {" "}
                          {/* truncate для имени */}
                          {userObj.fullName}
                        </span>
                        {isPlaying && (
                          <Music className="size-3.5 text-violet-400 shrink-0" />
                        )}
                      </div>
                      {isPlaying ? (
                        <div className="">
                          <div className="text-sm text-white font-medium truncate">
                            {songTitle}
                          </div>
                          <div className="text-xs text-zinc-400 truncate">
                            {artistName}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-zinc-400 truncate">
                          Idle
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FriendsActivity;

const LoginPrompt = () => (
  <div className="h-full flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-4">
    {" "}
    {/* Адаптивные отступы */}
    <div className="relative">
      <div
        className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full blur-lg
       opacity-75 animate-pulse"
        aria-hidden="true"
      />
      <div className="relative bg-zinc-900 rounded-full p-4 sm:p-3">
        {" "}
        {/* Адаптивный padding */}
        <HeadphonesIcon className="size-8 sm:size-7 text-emerald-400" />{" "}
        {/* Адаптивный размер иконки */}
      </div>
    </div>
    <div className="space-y-2 max-w-[250px] sm:max-w-[200px]">
      {" "}
      {/* Адаптивная максимальная ширина */}
      <h3 className="text-lg sm:text-base font-semibold text-white">
        {" "}
        {/* Адаптивный размер заголовка */}
        See What Friends Are Playing
      </h3>
      <p className="text-sm sm:text-xs text-zinc-400">
        {" "}
        {/* Адаптивный размер параграфа */}
        Login to discover what music your friends are enjoying right now
      </p>
    </div>
  </div>
);
