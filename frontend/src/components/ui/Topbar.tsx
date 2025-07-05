import { useNavigate, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { LayoutDashboardIcon, Search } from "lucide-react";
import { useAuthStore } from "../../stores/useAuthStore";
import { cn } from "../../lib/utils";
import { buttonVariants } from "./button";
import SignInOAuthButton from "./SignInOAuthButton";
import { auth } from "../../lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";

const Topbar = () => {
  const navigate = useNavigate();
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [query, setQuery] = useState("");

  const { isAdmin } = useAuthStore();

  const [user, setUser] = useState<null | {
    displayName: string | null;
    photoURL: string | null;
  }>(null);

  // Следим за авторизацией
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
        navigate(`/`);
      }
    }, 300);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 sticky top-0 bg-zinc-900/90 backdrop-blur-md z-20 shadow-md">
      {/* Лого */}
      <div className="flex gap-3 items-center">
        <img src="/Moodify.png" alt="Moodify" className="h-8 w-auto" />
      </div>

      {/* Поиск */}
      <div className="flex-1 max-w-lg mx-8 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5 pointer-events-none" />
        <input
          type="text"
          placeholder="Artists, songs, or podcasts"
          value={query}
          onChange={handleChange}
          className="
            w-full
            bg-zinc-800
            rounded-full
            py-2.5
            pl-12
            pr-4
            text-sm
            text-zinc-200
            placeholder:text-zinc-500
            focus:outline-none
            focus:ring-2
            focus:ring-violet-500
            transition
            duration-150
            ease-in-out
          "
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      {/* Кнопки справа */}
      <div className="flex items-center gap-4">
        {isAdmin && (
          <Link
            to={"/admin"}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <LayoutDashboardIcon className="w-5 h-5 mr-2" />
            Admin Dashboard
          </Link>
        )}

        {user ? (
          <div className="flex items-center gap-3">
            <img
              src={user.photoURL || "/Moodify.png"}
              alt="avatar"
              className="w-8 h-8 rounded-full"
            />
            <button
              onClick={handleLogout}
              className={cn(buttonVariants({ variant: "ghost" }), "text-sm")}
            >
              Logout
            </button>
          </div>
        ) : (
          <SignInOAuthButton />
        )}
      </div>
    </div>
  );
};

export default Topbar;
