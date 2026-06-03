import { useCanMutate } from "@/context/auth-role-context";
import { btnDisabled } from "@/lib/styles";

/** Returns props to disable create/edit/delete actions for Viewer role. */
export function useMutationGuard() {
  const canMutate = useCanMutate();
  return {
    canMutate,
    disabled: !canMutate,
    guardProps: {
      disabled: !canMutate,
      title: !canMutate ? "Read-only access — your role cannot modify data" : undefined,
    },
    guardClass: (baseClass: string) =>
      canMutate ? baseClass : `${baseClass} ${btnDisabled}`,
  };
}
