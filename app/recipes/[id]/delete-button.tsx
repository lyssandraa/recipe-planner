"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRecipe } from "../actions";
import { useToast } from "@/app/components/toast-provider";

export default function DeleteRecipeButton({ recipeId }: { recipeId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  return (
    <button
      type="button"
      className="mt-2 self-start text-sm text-red-600 disabled:opacity-50"
      disabled={isPending}
      onClick={() => {
        if (confirm("Delete this recipe? This can't be undone.")) {
          startTransition(async () => {
            await deleteRecipe(recipeId);
            toast("Recipe deleted");
            router.push("/recipes");
          });
        }
      }}
    >
      {isPending ? "Deleting…" : "Delete recipe"}
    </button>
  );
}
