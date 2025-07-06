import { Link, useLocation } from "react-router-dom";
import { HomeIcon, Search, Library, MessageCircle } from "lucide-react";
import { useAuthStore } from "../stores/useAuthStore";
import { cn } from "../lib/utils";
import { buttonVariants } from "../components/ui/button";

const BottomNavigationBar = () => {
  const location = useLocation();
  const { user } = useAuthStore();

  const navItems = [
    {
      to: "/",
      icon: HomeIcon,
      label: "Home",
      authRequired: false,
    },
    {
      to: "/search",
      icon: Search,
      label: "Search",
      authRequired: false,
    },
    {
      to: "/library",
      icon: Library,
      label: "Library",
      authRequired: true,
    },
    {
      to: "/chat",
      icon: MessageCircle,
      label: "Chat",
      authRequired: true,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 h-16 flex items-center justify-around z-65 ">
      {navItems.map((item) => {
        if (item.authRequired && !user) {
          return null;
        }

        const isActive = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "flex flex-col items-center justify-center p-0 h-full w-auto text-zinc-400 hover:text-white transition-colors duration-200",
              isActive ? "text-white" : "text-zinc-400"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNavigationBar;
