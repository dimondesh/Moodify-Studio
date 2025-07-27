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
import WaveAnalyzer from "./WaveAnalyzer";
import { useTranslation } from "react-i18next"; // <-- ИМПОРТ
import MoodifyLogo from "../MoodifyLogo";

const Topbar = () => {
  const { t } = useTranslation(); // <-- ИСПОЛЬЗОВАНИЕ ХУКА
  const navigate = useNavigate();
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [query, setQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const { isAdmin, user: authUser } = useAuthStore();

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
    navigate("/search");
    setIsSearchVisible(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

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

        {/* <img src="/Moodify.svg" alt="Moodify" className="h-8 w-auto" /> */}
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
              <DropdownMenuItem
                asChild
                className="p-2 cursor-pointer hover:bg-zinc-700"
              >
                <Link to={`/users/${authUser?.id}`}>
                  <UserIcon className="w-4 h-4 mr-2" />
                  {t("topbar.profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                asChild
                className="p-2 cursor-pointer hover:bg-zinc-700"
              >
                <Link to="/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  {t("topbar.settings")}
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem
                  asChild
                  className="p-2 cursor-pointer hover:bg-zinc-700"
                >
                  <Link to="/admin">
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
        ) : (
          <SignInOAuthButton />
        )}
      </div>
    </div>
  );
};

export default Topbar;
