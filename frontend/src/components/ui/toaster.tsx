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
        const isError = props.className?.includes("toast-error");

        return (
          <Toast
            key={id}
            {...props}
            className={`${props.className ?? ""} min-h-0 pl-3`}
          >
            <div
              className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                isError ? "bg-red-500" : "bg-neutral-800 dark:bg-white"
              }`}
            />
            <div
              className={`absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] ${
                isError
                  ? "border-red-500"
                  : "border-neutral-800 dark:border-white"
              }`}
            />

            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span
                className={`font-space font-bold uppercase tracking-[0.2em] text-[9px] leading-none ${
                  isError
                    ? "text-red-500"
                    : "text-neutral-800/40 dark:text-white/40"
                }`}
              >
                {isError ? "/ ERR" : "/ OK"}
              </span>

              <ToastDescription className="text-xs py-0 leading-snug">
                {description}
              </ToastDescription>
            </div>

            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport className="p-4 md:p-5" />
    </ToastProvider>
  );
}
