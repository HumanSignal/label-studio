import type { APIFullUser } from "../../types/User";

declare const useCurrentUser: () => {
  user: APIFullUser;
};
