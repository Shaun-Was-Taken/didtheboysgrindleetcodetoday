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
import type * as amazon from "../amazon.js";
import type * as anthropic from "../anthropic.js";
import type * as apple from "../apple.js";
import type * as atlassian from "../atlassian.js";
import type * as crons from "../crons.js";
import type * as databricks from "../databricks.js";
import type * as email from "../email.js";
import type * as files from "../files.js";
import type * as garmin from "../garmin.js";
import type * as google from "../google.js";
import type * as groups from "../groups.js";
import type * as http from "../http.js";
import type * as jobFetchers from "../jobFetchers.js";
import type * as leetcode from "../leetcode.js";
import type * as microsoft from "../microsoft.js";
import type * as nvidia from "../nvidia.js";
import type * as openai from "../openai.js";
import type * as salesforce from "../salesforce.js";
import type * as stripe from "../stripe.js";
import type * as stripe_jobs from "../stripe_jobs.js";
import type * as tmobile from "../tmobile.js";
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
  amazon: typeof amazon;
  anthropic: typeof anthropic;
  apple: typeof apple;
  atlassian: typeof atlassian;
  crons: typeof crons;
  databricks: typeof databricks;
  email: typeof email;
  files: typeof files;
  garmin: typeof garmin;
  google: typeof google;
  groups: typeof groups;
  http: typeof http;
  jobFetchers: typeof jobFetchers;
  leetcode: typeof leetcode;
  microsoft: typeof microsoft;
  nvidia: typeof nvidia;
  openai: typeof openai;
  salesforce: typeof salesforce;
  stripe: typeof stripe;
  stripe_jobs: typeof stripe_jobs;
  tmobile: typeof tmobile;
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
