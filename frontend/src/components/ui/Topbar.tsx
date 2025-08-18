// src/components/ui/Topbar.tsx
import { useNavigate, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboardIcon,
  Search,
  LogOut,
  Settings,
  UserIcon,
} from "lucide-react";
import { useAuthStore } from "../../stores/useAuthStore";
import { cn } from "../../lib/utils";
import { Button, buttonVariants } from "./button";
import SignInOAuthButton from "./SignInOAuthButton";
import { auth } from "../../lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "../ui/sheet"; // NEW: Импорт компонентов Sheet
import { useMediaQuery } from "../../hooks/useMediaQuery"; // NEW: Импорт хука
import WaveAnalyzer from "./WaveAnalyzer";
import { useTranslation } from "react-i18next";
import MoodifyLogo from "../MoodifyLogo";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"; // NEW: Импорт Avatar

const Topbar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [query, setQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const { isAdmin, user: authUser } = useAuthStore();
  const isMobile = useMediaQuery("(max-width: 768px)"); // NEW: Хук для определения мобильного устройства

  const [user, setUser] = useState<null | {
    displayName: string | null;
    photoURL: string | null;
  }>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      if (val.trim() !== "") {
        navigate(`/search?q=${encodeURIComponent(val)}`);
      } else {
        if (location.pathname.startsWith("/search")) {
          navigate(`/`);
        }
      }
    }, 300);
  };

  const handleBlur = () => {
    setQuery("");
    setIsSearchVisible(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // NEW: Создаем переиспользуемый компонент для пунктов меню
  const UserMenuItems = () => (
    <>
      <SheetClose asChild>
        <Link
          to={`/users/${authUser?.id}`}
          className="flex items-center p-2 cursor-pointer hover:bg-zinc-700 rounded-md"
        >
          <UserIcon className="w-4 h-4 mr-2" />
          {t("topbar.profile")}
        </Link>
      </SheetClose>
      <SheetClose asChild>
        <Link
          to="/settings"
          className="flex items-center p-2 cursor-pointer hover:bg-zinc-700 rounded-md"
        >
          <Settings className="w-4 h-4 mr-2" />
          {t("topbar.settings")}
        </Link>
      </SheetClose>
      {isAdmin && (
        <SheetClose asChild>
          <Link
            to="/admin"
            className="flex items-center p-2 cursor-pointer hover:bg-zinc-700 rounded-md"
          >
            <LayoutDashboardIcon className="w-4 h-4 mr-2" />
            {t("topbar.adminDashboard")}
          </Link>
        </SheetClose>
      )}
      <div className="w-full h-px bg-zinc-700 my-1" />
      <div
        onClick={handleLogout}
        className="flex items-center text-red-400 p-2 cursor-pointer hover:bg-zinc-700 rounded-md"
      >
        <LogOut className="w-4 h-4 mr-2" />
        {t("topbar.logout")}
      </div>
    </>
  );

  return (
    <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-zinc-900/90 backdrop-blur-md z-20 shadow-md sm:px-6">
      <div
        className={`flex gap-3 items-center ${
          isSearchVisible ? "hidden sm:flex" : "flex"
        }`}
      >
        <Link to="/">
          <MoodifyLogo />
        </Link>
        <WaveAnalyzer width={120} height={30} />
      </div>

      <div
        className={`relative flex-1 max-w-lg ${
          isSearchVisible ? "block" : "hidden md:block"
        }`}
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5 pointer-events-none" />
        <input
          type="text"
          placeholder={t("topbar.searchPlaceholder")}
          value={query}
          onChange={handleChange}
          autoFocus={isSearchVisible}
          onBlur={handleBlur}
          className="
            w-full bg-zinc-800 rounded-full py-2.5 pl-12 pr-4 text-sm
            text-zinc-200 placeholder:text-zinc-500 focus:outline-none
            focus:ring-2 focus:ring-violet-500 transition duration-150 ease-in-out
          "
          spellCheck={false}
          autoComplete="off"
        />
        {isSearchVisible && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white md:hidden"
            onClick={() => setIsSearchVisible(false)}
          >
            {t("topbar.cancel")}
          </Button>
        )}
      </div>

      <div
        className={`flex items-center gap-4 ${
          isSearchVisible ? "hidden" : "flex"
        }`}
      >
        {user && (
          <Button
            size="icon"
            variant="ghost"
            className="md:hidden"
            onClick={() => setIsSearchVisible(true)}
          >
            <Search className="w-5 h-5" />
          </Button>
        )}
        {isAdmin && (
          <Link
            to={"/admin"}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hidden sm:inline-flex"
            )}
          >
            <LayoutDashboardIcon className="w-4 h-4 mr-2" />
            <span className="hidden md:inline">{t("topbar.admin")}</span>
          </Link>
        )}

        {user ? (
          isMobile ? (
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-8 w-8 rounded-full"
                >
                  <img
                    src={user.photoURL || "/Moodify.png"}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="bg-zinc-900 border-l-zinc-800 text-white w-[250px] p-0"
              >
                <SheetHeader className="p-4 border-b border-zinc-800">
                  <SheetTitle className="sr-only">User Menu</SheetTitle>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage
                        src={user.photoURL || "/Moodify.png"}
                        alt="avatar"
                      />
                      <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <p className="font-semibold">{user.displayName}</p>
                  </div>
                </SheetHeader>
                <div className="p-4 flex flex-col gap-2">
                  <UserMenuItems />
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            // ORIGINAL: Десктопная версия с DropdownMenu
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-8 w-8 rounded-full"
                >
                  <img
                    src={user.photoURL || "/Moodify.png"}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48 bg-zinc-800 border-zinc-700 text-white p-1"
                align="end"
              >
                {user.displayName && (
                  <DropdownMenuItem className="text-sm font-semibold cursor-default text-zinc-200 p-2 opacity-100 hover:bg-zinc-700">
                    {user.displayName}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-zinc-700" />
                {/* Используем обертки для DropdownMenuItem */}
                <DropdownMenuItem asChild className="p-0">
                  <Link
                    to={`/users/${authUser?.id}`}
                    className="flex items-center w-full p-2 cursor-pointer hover:bg-zinc-700 rounded-sm"
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    {t("topbar.profile")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="p-0">
                  <Link
                    to="/settings"
                    className="flex items-center w-full p-2 cursor-pointer hover:bg-zinc-700 rounded-sm"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {t("topbar.settings")}
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild className="p-0">
                    <Link
                      to="/admin"
                      className="flex items-center w-full p-2 cursor-pointer hover:bg-zinc-700 rounded-sm"
                    >
                      <LayoutDashboardIcon className="w-4 h-4 mr-2" />
                      {t("topbar.adminDashboard")}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-400 p-2 cursor-pointer hover:bg-zinc-700"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("topbar.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        ) : (
          <SignInOAuthButton />
        )}
      </div>
    </div>
  );
};

export default Topbar;
