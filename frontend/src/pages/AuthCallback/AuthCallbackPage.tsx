import { useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../lib/firebase";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";

const AuthCallbackPage = () => {
  const [user, loading, error] = useAuthState(auth);
  const navigate = useNavigate();
  const { syncUser } = useAuthStore();

  useEffect(() => {
    if (loading) return;

    if (error) {
      console.error("Firebase auth error:", error);
      navigate("/login");
      return;
    }

    if (user) {
      console.log("Firebase user:", user); // Логируем данные пользователя
      const syncData = {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
      };
      console.log("Sending sync data:", syncData);

      syncUser(syncData)
        .then(() => {
          console.log("User synced successfully");
          navigate("/");
        })
        .catch((err) => {
          console.error("Sync failed:", err);
          navigate("/login");
        });
    } else {
      navigate("/login");
    }
  }, [user, loading, error, navigate, syncUser]);

  return <div>Loading...</div>;
};

export default AuthCallbackPage;
