import { useNavigate } from "react-router-dom";
import axios from "axios";
import { signInWithPopup } from "firebase/auth";
import { auth, provider, requestNotificationPermission } from "../firebase";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21.6 12.22C21.6 11.5 21.54 10.96 21.41 10.4H12V13.96H17.52C17.41 14.84 16.81 16.17 15.49 17.06L15.47 17.18L18.35 19.37L18.55 19.39C20.39 17.73 21.6 15.29 21.6 12.22Z" fill="#4285F4"/>
      <path d="M12 22C14.7 22 16.96 21.12 18.55 19.39L15.49 17.06C14.67 17.62 13.56 18.01 12 18.01C9.36 18.01 7.12 16.35 6.34 14.06L6.22 14.07L3.22 16.35L3.18 16.46C4.76 19.53 8.1 22 12 22Z" fill="#34A853"/>
      <path d="M6.34 14.06C6.13 13.5 6.01 12.9 6.01 12.28C6.01 11.66 6.13 11.06 6.33 10.5L6.32 10.37L3.28 8.05L3.18 8.1C2.52 9.39 2.14 10.83 2.14 12.28C2.14 13.73 2.52 15.16 3.18 16.46L6.34 14.06Z" fill="#FBBC05"/>
      <path d="M12 6.54C13.97 6.54 15.31 7.37 16.07 8.06L18.61 5.64C16.95 4.13 14.7 3 12 3C8.1 3 4.76 5.46 3.18 8.1L6.33 10.5C7.12 8.2 9.36 6.54 12 6.54Z" fill="#EA4335"/>
    </svg>
  );
}

function Login() {
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const response = await axios.post(`${API_BASE}/google-login`, {
        email: user.email,
        name: user.displayName,
      });

      const data = response.data;

      localStorage.setItem("smartaid_token", data.access_token);
      localStorage.setItem("smartaid_role", data.role);
      localStorage.setItem("smartaid_email", user.email);
      localStorage.setItem("smartaid_user_id", String(data.user_id));
      localStorage.setItem("smartaid_name", data.name);

      // Strict Role-based redirect
      if (data.role === "super_admin" || data.role === "admin") {
        navigate("/admin");
      } else if (data.role === "volunteer") {
        navigate("/volunteer-dashboard");
      } else {
        // user role
        if (data.volunteer_request_status === "pending" || data.volunteer_request_status === "rejected") {
          navigate("/application-review");
        } else {
          navigate("/register-volunteer");
        }
      }

      // Request push notification permission after login
      requestNotificationPermission().catch(() => {});
    } catch (error) {
      console.error("Login Flow Error:", error);
      
      if (error.code === "auth/popup-closed-by-user") {
        // User closed the popup, no need to show an error
        return;
      }
      
      if (error.isAxiosError || error.name === "AxiosError") {
        alert(`Backend Connection Error: ${error.message}. Please ensure the backend server is running on ${API_BASE}`);
      } else if (error.code === "auth/unauthorized-domain") {
        alert(
          "Google Login Error: unauthorized-domain. Open the app using http://localhost:5173 (not 127.0.0.1). " +
          "If needed, add localhost and 127.0.0.1 in Firebase Console > Authentication > Settings > Authorized domains."
        );
      } else {
        alert(`Login Error: ${error.code || error.message || "Unknown error"}`);
      }
    }
  };

  return (
    <section className="mx-auto w-full max-w-md py-16 sm:py-24 text-center">
      <div className="rounded-2xl border border-[#e9dce1] bg-white p-8 shadow-[0_18px_48px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1f1720]">Welcome to SmartAid</h1>
        <p className="mt-2 text-sm text-[#6a565d] mb-8">Sign in to access your dashboard or apply to volunteer.</p>
        
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex h-12 items-center justify-center gap-3 rounded-xl border border-[#dfcdd3] bg-white px-4 text-sm font-semibold text-[#4a3a40] shadow-sm transition hover:border-[#7a1731] hover:bg-gray-50"
        >
          <GoogleIcon />
          Sign in with Google
        </button>
      </div>
    </section>
  );
}

export default Login;
