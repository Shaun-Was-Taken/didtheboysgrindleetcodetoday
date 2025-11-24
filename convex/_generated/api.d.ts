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
import type * as crons from "../crons.js";
import type * as files from "../files.js";
import type * as garmin from "../garmin.js";
import type * as http from "../http.js";
import type * as leetcode from "../leetcode.js";
import type * as stripe from "../stripe.js";
import type * as user from "../user.js";

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
  crons: typeof crons;
  files: typeof files;
  garmin: typeof garmin;
  http: typeof http;
  leetcode: typeof leetcode;
  stripe: typeof stripe;
  user: typeof user;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
