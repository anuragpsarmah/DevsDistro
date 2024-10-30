import { ReactNode, useEffect } from "react";
import { user } from "@/utils/atom";
import { useRecoilState } from "recoil";
import { useNavigate } from "react-router-dom";
import { useAuthValidationQuery, useLogoutQuery } from "@/hooks/ApiQueries";
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

export default function ProtectedRouteWrapper({
  children,
}: AuthValidatorProps) {
  const [, setActiveUser] = useRecoilState(user);
  const navigate = useNavigate();
  const { data, isLoading, isError } = useAuthValidationQuery();
  const { refetch: logout } = useLogoutQuery();

  useEffect(() => {
    const handleAuthValidation = async () => {
      if (isError) {
        await logout();
        setActiveUser(emptyUserObject);
        navigate("/");
      } else if (!isLoading && data) {
        setActiveUser(data);
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

  return <>{children}</>;
}
