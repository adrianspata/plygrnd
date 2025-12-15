import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { postNewsletterSubscribe, InputType, OutputType } from "../../endpoints/newsletter/subscribe_POST.schema";

/**
 * Custom hook for subscribing to the newsletter.
 * Uses React Query's useMutation.
 */
export const useNewsletterSubscribe = (): UseMutationResult<OutputType, Error, InputType> => {
  return useMutation({
    mutationFn: (data: InputType) => postNewsletterSubscribe(data),
  });
};