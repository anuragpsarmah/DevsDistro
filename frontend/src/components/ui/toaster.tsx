import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, description, ...props }) {
        return (
          <Toast
            key={id}
            {...props}
            className={`${props.className} shadow-sm min-h-0`}
          >
            <div className="flex items-center justify-between gap-2">
              <ToastDescription className="text-sm py-0.5">
                {description}
              </ToastDescription>
              <ToastClose className="text-gray-500 hover:text-white p-0 h-4 w-4 transition-colors duration-200" />
            </div>
          </Toast>
        );
      })}
      <ToastViewport className="p-4 md:p-5" />
    </ToastProvider>
  );
}
