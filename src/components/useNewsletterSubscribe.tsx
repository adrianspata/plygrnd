import { useMutation, UseMutationResult } from "@tanstack/react-query";
import {
  InputType,
  OutputType,
  postNewsletterSubscribe,
} from "../../endpoints/newsletter/subscribe_POST.schema";

export const useNewsletterSubscribe = (): UseMutationResult<
  OutputType,
  Error,
  InputType
> => {
  return useMutation({
    mutationFn: async (data: InputType) => {
      return postNewsletterSubscribe(data);
    },
  });
};