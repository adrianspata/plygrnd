import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { InputType, OutputType } from "../../endpoints/newsletter/subscribe_POST.schema";

export const useNewsletterSubscribe = (): UseMutationResult<OutputType, Error, InputType> => {
  return useMutation({
    mutationFn: async (data: InputType) => {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: "6de01c74-950d-4257-811e-a9ee0fd77ce1",
          email: data.email,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to subscribe");
      }

      return {
        success: result.success,
        message: result.message,
      };
    },
  });
};