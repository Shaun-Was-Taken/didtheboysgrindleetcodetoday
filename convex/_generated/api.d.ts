/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as access from "../access.js";
import type * as admin from "../admin.js";
import type * as adobe from "../adobe.js";
import type * as airbnb from "../airbnb.js";
import type * as amazon from "../amazon.js";
import type * as anthropic from "../anthropic.js";
import type * as apple from "../apple.js";
import type * as atlassian from "../atlassian.js";
import type * as clerkMigration from "../clerkMigration.js";
import type * as companies from "../companies.js";
import type * as crons from "../crons.js";
import type * as databricks from "../databricks.js";
import type * as datadog from "../datadog.js";
import type * as discord from "../discord.js";
import type * as duolingo from "../duolingo.js";
import type * as email from "../email.js";
import type * as garmin from "../garmin.js";
import type * as gm from "../gm.js";
import type * as google from "../google.js";
import type * as groups from "../groups.js";
import type * as hrblock from "../hrblock.js";
import type * as http from "../http.js";
import type * as jobAlerts from "../jobAlerts.js";
import type * as jobAudit from "../jobAudit.js";
import type * as jobFetchers from "../jobFetchers.js";
import type * as leetcode from "../leetcode.js";
import type * as leetcodeSync from "../leetcodeSync.js";
import type * as leetcodeSyncNode from "../leetcodeSyncNode.js";
import type * as microsoft from "../microsoft.js";
import type * as netsmart from "../netsmart.js";
import type * as nvidia from "../nvidia.js";
import type * as openai from "../openai.js";
import type * as oppd from "../oppd.js";
import type * as pinterest from "../pinterest.js";
import type * as salesforce from "../salesforce.js";
import type * as stripe from "../stripe.js";
import type * as stripe_jobs from "../stripe_jobs.js";
import type * as tmobile from "../tmobile.js";
import type * as uber from "../uber.js";
import type * as user from "../user.js";
import type * as wellsky from "../wellsky.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  access: typeof access;
  admin: typeof admin;
  adobe: typeof adobe;
  airbnb: typeof airbnb;
  amazon: typeof amazon;
  anthropic: typeof anthropic;
  apple: typeof apple;
  atlassian: typeof atlassian;
  clerkMigration: typeof clerkMigration;
  companies: typeof companies;
  crons: typeof crons;
  databricks: typeof databricks;
  datadog: typeof datadog;
  discord: typeof discord;
  duolingo: typeof duolingo;
  email: typeof email;
  garmin: typeof garmin;
  gm: typeof gm;
  google: typeof google;
  groups: typeof groups;
  hrblock: typeof hrblock;
  http: typeof http;
  jobAlerts: typeof jobAlerts;
  jobAudit: typeof jobAudit;
  jobFetchers: typeof jobFetchers;
  leetcode: typeof leetcode;
  leetcodeSync: typeof leetcodeSync;
  leetcodeSyncNode: typeof leetcodeSyncNode;
  microsoft: typeof microsoft;
  netsmart: typeof netsmart;
  nvidia: typeof nvidia;
  openai: typeof openai;
  oppd: typeof oppd;
  pinterest: typeof pinterest;
  salesforce: typeof salesforce;
  stripe: typeof stripe;
  stripe_jobs: typeof stripe_jobs;
  tmobile: typeof tmobile;
  uber: typeof uber;
  user: typeof user;
  wellsky: typeof wellsky;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
