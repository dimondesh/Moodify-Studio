import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, signOut } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Button } from "../../components/ui/button";

const Header = () => {
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

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/" className="rounded-lg">
          <img src="/Moodify.png" className="size-10 text-black" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Music Manager</h1>
          <p className="text-zinc-400 mt-1">Manage your music catalog</p>
        </div>
      </div>

      {user ? (
        <div className="flex items-center gap-3">
          <img
            src={user.photoURL || "/Moodify.png"}
            alt="avatar"
            className="w-8 h-8 rounded-full"
          />
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      ) : (
        <div className="text-white text-sm opacity-70">Not signed in</div>
      )}
    </div>
  );
};

export default Header;
