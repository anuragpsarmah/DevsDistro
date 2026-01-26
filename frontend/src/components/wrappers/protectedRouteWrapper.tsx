import { ReactNode, useEffect, cloneElement, isValidElement } from "react";
import { user, userCurrency } from "@/utils/atom";
import { useRecoilState } from "recoil";
import { useNavigate } from "react-router-dom";
import {
  useAuthValidationQuery,
  useLogoutQuery,
  useUserCurrencyQuery,
} from "@/hooks/apiQueries";
import { tryCatch } from "@/utils/tryCatch.util";
import BackgroundDots from "../ui/backgroundDots";

interface AuthValidatorProps {
  children: ReactNode;
}

const emptyUserObject = {
  _id: "",
  username: "",
  name: "",
  profile_image_url: "",
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
  const [, setUserCurrency] = useRecoilState(userCurrency);
  const navigate = useNavigate();
  const {
    data: userData,
    isLoading: isUserDataLoading,
    isError: isUserDataError,
  } = useAuthValidationQuery();
  const {
    data: regionData,
    isLoading: isRegionDataLoading,
    isError: isRegionDataError,
  } = useUserCurrencyQuery();
  const { refetch: logout } = useLogoutQuery();

  const handleLogout = async () => {
    await logout();
    setActiveUser(emptyUserObject);
    navigate("/");
  };

  useEffect(() => {
    const handleAuthValidation = async () => {
      if (isUserDataError) {
        await logout();
        setActiveUser(emptyUserObject);
        navigate("/");
      } else if (!isUserDataLoading && userData) {
        setActiveUser(userData.data);
        if (userData.data.profile_image_url) {
          const [, error] = await tryCatch(() =>
            preFetchImage(userData.data.profile_image_url)
          );
          if (error) {
            console.warn("Failed to prefetch profile image:", error);
          }
        }
      }
    };

    if (!isRegionDataError && !isRegionDataLoading && regionData?.currency) {
      setUserCurrency(regionData.currency);
    }

    handleAuthValidation();
  }, [
    isUserDataError,
    isUserDataLoading,
    userData,
    isRegionDataError,
    isRegionDataLoading,
    regionData,
    logout,
    navigate,
    setActiveUser,
    setUserCurrency,
  ]);

  if (isUserDataLoading) {
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
