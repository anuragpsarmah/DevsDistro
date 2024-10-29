import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const backend_uri = import.meta.env.VITE_BACKEND_URI;

const useAuthValidationQuery = () => {
  return useQuery({
    queryKey: ["authValidation"],
    queryFn: async () => {
      const response = await axios.get(`${backend_uri}/auth/authValidation`, {
        withCredentials: true,
      });
      console.log(response.data);
      return response.data;
    },
  });
};

const useLogoutQuery = () => {
  return useQuery({
    queryKey: ["logoutQuery"],
    queryFn: async () => {
      const response = await axios.get(`${backend_uri}/auth/githubLogout`, {
        withCredentials: true,
      });
      return response.data;
    },
    enabled: false,
  });
};

export { useAuthValidationQuery, useLogoutQuery };
