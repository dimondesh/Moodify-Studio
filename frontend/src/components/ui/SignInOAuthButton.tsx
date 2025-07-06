import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { Button } from "./button";
import { useNavigate } from "react-router-dom";

const SignInOAuthButton = () => {
  const navigate = useNavigate();

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      if (result?.user?.uid) {
        navigate("/");
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  return (
    <Button
      onClick={signInWithGoogle}
      variant="secondary"
      className="w-3fr text-white border-zinc-200 h-11"
    >
      Continue with Google
    </Button>
  );
};

export default SignInOAuthButton;
