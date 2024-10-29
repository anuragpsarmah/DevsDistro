import { ReactNode, useEffect } from "react";
import { user } from "@/utils/atom";
import { useRecoilState } from "recoil";
import { useNavigate } from "react-router-dom";
import { useAuthValidationQuery, useLogoutQuery } from "@/hooks/ApiQueries";
import LoadingPage from "@/components/pages/loading/loading";

interface AuthValidatorProps {
  children: ReactNode;
}

const emptyUserObject = {
  _id: "",
  username: "",
  name: "",
  profileImageUrl: "",
};

export default function ProtectedRoute({ children }: AuthValidatorProps) {
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
    return <LoadingPage />;
  }

  return <>{children}</>;
}
