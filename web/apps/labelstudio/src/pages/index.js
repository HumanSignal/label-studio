import { ProjectsPage } from "./Projects/Projects";
import { HomePage } from "./Home/HomePage";
import { OrganizationPage } from "./Organization";
import { ModelsPage } from "./Organization/Models/ModelsPage";
import { BillingPage } from "./Billing/BillingPage";
import { FF_HOMEPAGE, isFF } from "../utils/feature-flags";
import { pages } from "@humansignal/app-common";
import { ff } from "@humansignal/core";

export const Pages = [
  isFF(FF_HOMEPAGE) && HomePage,
  ProjectsPage,
  OrganizationPage,
  ModelsPage,
  BillingPage,
  ff.isFF(ff.FF_AUTH_TOKENS) && pages.AccountSettingsPage,
].filter(Boolean);
