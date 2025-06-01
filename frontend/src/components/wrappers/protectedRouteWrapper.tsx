import { ReactNode, useEffect, cloneElement, isValidElement } from "react";
import { user } from "@/utils/atom";
import { useRecoilState } from "recoil";
import { useNavigate } from "react-router-dom";
import { useAuthValidationQuery, useLogoutQuery } from "@/hooks/apiQueries";
import BackgroundDots from "../ui/backgroundDots";

interface AuthValidatorProps {
  children: ReactNode;
}

const emptyUserObject = {
  _id: "",
  username: "",
  name: "",
  profileImageUrl: "",
};

const preFetchImage = (imageUrl: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      resolve();
      return;
    }

    const img = new Image();

    img.crossOrigin = "anonymous";

    img.onload = () => {
      resolve();
    };

    img.onerror = () => {
      reject(new Error("Failed to load image."));
    };

    img.src = imageUrl;

    const existingLink = document.querySelector(`link[href="${imageUrl}"]`);
    if (!existingLink) {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "image";
      link.href = imageUrl;
      document.head.appendChild(link);
    }
  });
};

export default function ProtectedRouteWrapper({
  children,
}: AuthValidatorProps) {
  const [, setActiveUser] = useRecoilState(user);
  const navigate = useNavigate();
  const { data, isLoading, isError } = useAuthValidationQuery();
  const { refetch: logout } = useLogoutQuery();

  const handleLogout = async () => {
    await logout();
    setActiveUser(emptyUserObject);
    navigate("/");
  };

  useEffect(() => {
    const handleAuthValidation = async () => {
      if (isError) {
        await logout();
        setActiveUser(emptyUserObject);
        navigate("/");
      } else if (!isLoading && data) {
        setActiveUser(data.data);
        if (data.data.profileImageUrl) {
          try {
            await preFetchImage(data.data.profileImageUrl);
          } catch (error) {
            console.warn("Failed to prefetch profile image:", error);
          }
        }
      }
    };
    handleAuthValidation();
  }, [isError, isLoading, data, logout, navigate, setActiveUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 text-white relative overflow-hidden">
        <BackgroundDots />
      </div>
    );
  }

  return isValidElement(children)
    ? cloneElement(children, { logout: handleLogout } as {
        logout: () => Promise<void>;
      })
    : children;
}
