import { toast } from "@/hooks/use-toast";

export const successToast = (message: string) => {
  toast({
    description: message,
    className: "bg-gray-900/90 border-blue-500/30 text-blue-100 px-4 py-3 shadow-lg shadow-blue-500/10",
  });
};

export const errorToast = (message: string) => {
  toast({
    description: message,
    className: "bg-gray-900/90 border-red-500/30 text-red-200 px-4 py-3 shadow-lg shadow-red-500/10",
  });
};
