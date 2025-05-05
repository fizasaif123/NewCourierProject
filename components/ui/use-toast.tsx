import { useToast as useToastOriginal } from "@/hooks/use-toast";

export const useToast = () => {
  return useToastOriginal();
};