import type { Role } from "@prisma/client";

export const MONEY_ROLES: Role[] = ["OWNER", "ACCOUNTS"];
export const ORDER_ROLES: Role[] = ["OWNER", "ACCOUNTS", "SALES", "DISPATCH"];

/** Owner and accounts see costs, profit, cash and suppliers. */
export const canSeeMoney = (role: Role) => MONEY_ROLES.includes(role);
/** Sales executives only see their own orders. */
export const seesOnlyOwnOrders = (role: Role) => role === "SALES";
export const canSeePrices = (role: Role) => role !== "DISPATCH" && role !== "MARKETING";

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Owner",
  ACCOUNTS: "Accounts",
  SALES: "Sales executive",
  DISPATCH: "Dispatch",
  MARKETING: "Marketing",
};
