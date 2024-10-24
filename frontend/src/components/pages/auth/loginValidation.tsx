import { useState, useEffect } from "react";
import axios from "axios";
import BackgroundDots from "../../ui/backgroundDots";

export default function LoginValidation() {
  const [mounted, setMounted] = useState(false);
  const url = new URL(window.location.href);
  const githubCode = url.searchParams.get("code");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const validateLogin = async () => {
      const response = await axios.get(
        `http://localhost:3000/api/auth/githubLogin?code=${githubCode}`
      );

      console.log(response);
    };

    try {
      validateLogin();
    } catch (error) {
      console.log(error);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4 relative overflow-hidden">
      {mounted && <BackgroundDots />}
    </div>
  );
}
