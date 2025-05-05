import { Toast } from "@/components/ui/toast";

type ToastProps = React.ComponentProps<typeof Toast>;

export function useToast() {
  const toast = (props: Partial<ToastProps>) => {
    // Implementation will be handled by shadcn/ui toast
    console.log('Toast:', props);
  };

  return {
    toast,
    dismiss: (toastId?: string) => {
      console.log('Dismiss toast:', toastId);
    },
  };
}