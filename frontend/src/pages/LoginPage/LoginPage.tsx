import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate("/auth-callback");
    } catch (error) {
      console.error("Login error", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <h1 className="mb-6 text-3xl font-bold">Login</h1>
      <button
        onClick={handleGoogleLogin}
        className="px-6 py-3 bg-blue-600 rounded hover:bg-blue-700"
      >
        Login with Google
      </button>
    </div>
  );
};

export default LoginPage;
