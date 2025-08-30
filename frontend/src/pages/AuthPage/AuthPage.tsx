import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  updateProfile,
  AuthError,
  signOut, // --- ИЗМЕНЕНИЕ: Импортируем signOut ---
} from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useAuthStore } from "../../stores/useAuthStore";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Loader2, MailCheck } from "lucide-react"; // --- ИЗМЕНЕНИЕ: Добавляем иконку
import MoodifyLogo from "../../components/MoodifyLogo";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import "./AuthPage.css";

const AuthPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const [isLoginView, setIsLoginView] = useState(
    location.state?.mode !== "signup"
  );
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  // --- ИЗМЕНЕНИЕ НАЧАЛО ---
  const [verificationSent, setVerificationSent] = useState(false);
  // --- ИЗМЕНЕНИЕ КОНЕЦ ---

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const validateEmail = (email: string) => {
    if (!email) return "Email is required.";
    if (email.length > 30) return "Email must be 30 characters or less.";
    if (!/\S+@\S+\.\S+/.test(email)) return "Invalid email address.";
    return "";
  };

  const validatePassword = (password: string) => {
    if (!password) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password.length > 20) return "Password must be 20 characters or less.";
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate("/");
    } catch (error) {
      toast.error("Google sign-in failed. Please try again.");
      console.error("Google sign-in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }

    setIsLoading(true);

    try {
      if (isLoginView) {
        await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        toast.success("Logged in successfully!");
        navigate("/");
      } else {
        // --- ИЗМЕНЕНИЕ НАЧАЛО: Логика регистрации ---
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        await updateProfile(userCredential.user, {
          displayName: formData.fullName,
        });
        await sendEmailVerification(userCredential.user);

        // Сразу вылогиниваем, чтобы заставить пользователя подтвердить почту
        await signOut(auth);

        toast.success("Account created! Please check your email to verify.");
        setVerificationSent(true); // Показываем сообщение о верификации
        // --- ИЗМЕНЕНИЕ КОНЕЦ ---
      }
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = "An unknown error occurred.";
      switch (authError.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          errorMessage = "Invalid email or password.";
          break;
        case "auth/email-already-in-use":
          errorMessage = "This email is already registered.";
          break;
        case "auth/invalid-email":
          errorMessage = "The email address is not valid.";
          break;
        default:
          errorMessage = "Authentication failed. Please try again.";
      }
      toast.error(errorMessage);
      console.error("Firebase auth error:", authError);
    } finally {
      setIsLoading(false);
    }
  };

  // --- ИЗМЕНЕНИЕ НАЧАЛО: Компонент для сообщения о верификации ---
  if (verificationSent) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md text-center">
          <main className="bg-zinc-900 rounded-lg p-8 shadow-lg">
            <MailCheck className="w-16 h-16 text-violet-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Verify your email</h1>
            <p className="text-zinc-400 mb-6">
              We've sent a verification link to{" "}
              <span className="font-bold text-white">{formData.email}</span>.
              Please check your inbox and follow the link to activate your
              account.
            </p>
            <Button
              onClick={() => {
                setVerificationSent(false);
                setIsLoginView(true);
              }}
              className="w-full h-12 bg-violet-600 hover:bg-violet-700"
            >
              Back to Login
            </Button>
          </main>
        </div>
      </div>
    );
  }
  // --- ИЗМЕНЕНИЕ КОНЕЦ ---

  return (
    <>
      <Helmet>
        <title>{isLoginView ? "Log In" : "Sign Up"} to Moodify</title>
      </Helmet>
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md">
          <header className="text-center mb-8"></header>

          <main className="bg-zinc-900 rounded-lg p-8 shadow-lg">
            <Link to="/" className="flex justify-center mb-6">
              <div className="auth-logo-container">
                <MoodifyLogo />
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-center mb-6">
              {isLoginView ? "Log in to Moodify" : "Sign up to Moodify"}
            </h1>

            <Button
              onClick={handleGoogleSignIn}
              variant="outline"
              className="w-full h-12 border-zinc-700 hover:bg-zinc-800"
              disabled={isLoading}
            >
              <img src="/google.svg" alt="Google" className="w-5 h-5 mr-3" />
              Continue with Google
            </Button>

            <div className="flex items-center my-6">
              <div className="flex-grow border-t border-zinc-700"></div>
              <span className="mx-4 text-zinc-500 text-sm">OR</span>
              <div className="flex-grow border-t border-zinc-700"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLoginView && (
                <div>
                  <Label htmlFor="fullName">What should we call you?</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Your name"
                    required
                    className="mt-1"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  required
                  maxLength={30}
                  className="mt-1"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  maxLength={20}
                  className="mt-1"
                />
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-violet-600 hover:bg-violet-700"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoginView ? "Log In" : "Sign Up"}
              </Button>
            </form>

            <div className="text-center mt-6 text-sm text-zinc-400">
              {isLoginView ? (
                <span>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => setIsLoginView(false)}
                    className="text-violet-400 hover:underline"
                  >
                    Sign up
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{" "}
                  <button
                    onClick={() => setIsLoginView(true)}
                    className="text-violet-400 hover:underline"
                  >
                    Log in
                  </button>
                </span>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default AuthPage;
