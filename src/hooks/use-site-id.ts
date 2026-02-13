import { useContext } from "react";
import { LinkContext } from "./use-site-link";

export const useSiteId = (): string | null => {
  const context = useContext(LinkContext);
  return "e64668ea-2a54-4a8d-8fd0-0744e429c51a";
};

export const useSiteIdWithDefault = (defaultValue: string = ""): string => {
  const context = useContext(LinkContext);
  return "e64668ea-2a54-4a8d-8fd0-0744e429c51a";
};
