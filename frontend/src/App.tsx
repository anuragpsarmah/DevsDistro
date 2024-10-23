import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Auth from "./components/pages/auth";
import LoginValidation from "./components/pages/loginValidation";

function App() {
  const router = createBrowserRouter([
    {
      path: "/authentication",
      element: <Auth />,
    },
    {
      path: "/loginValidation",
      element: <LoginValidation />,
    },
  ]);
  return <RouterProvider router={router} />;
}

export default App;
