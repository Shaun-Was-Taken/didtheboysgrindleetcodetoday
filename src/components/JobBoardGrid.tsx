"use client";

import GarminJobs from "./GarminJobs";
import AmazonJobs from "./AmazonJobs";
import MicrosoftJobs from "./MicrosoftJobs";
import AtlassianJobs from "./AtlassianJobs";
import WellSkyJobs from "./WellSkyJobs";
import TMobileJobs from "./TMobileJobs";
import NvidiaJobs from "./NvidiaJobs";
import SalesforceJobs from "./SalesforceJobs";
import StripeJobs from "./StripeJobs";
import DatabricksJobs from "./DatabricksJobs";
import GoogleJobs from "./GoogleJobs";
import AppleJobs from "./AppleJobs";
import OpenAIJobs from "./OpenAIJobs";
import AnthropicJobs from "./AnthropicJobs";
import OppdJobs from "./OppdJobs";
import HRBlockJobs from "./HRBlockJobs";
import NetsmartJobs from "./NetsmartJobs";
import GMJobs from "./GMJobs";
import PinterestJobs from "./PinterestJobs";
import AirbnbJobs from "./AirbnbJobs";
import DatadogJobs from "./DatadogJobs";
import { useIsOwner } from "@/hooks/useIsOwner";

export default function JobBoardGrid() {
  // Owner-only boards (Garmin, WellSky, OPPD, H&R Block, Netsmart) are hidden
  // from everyone else; their Convex queries are gated server-side too.
  const isOwner = useIsOwner();

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
      {isOwner && <GarminJobs />}
      <AmazonJobs />
      <MicrosoftJobs />
      <AtlassianJobs />
      {isOwner && <WellSkyJobs />}
      <TMobileJobs />
      <GoogleJobs />
      <NvidiaJobs />
      <SalesforceJobs />
      <StripeJobs />
      <DatabricksJobs />
      <AppleJobs />
      <OpenAIJobs />
      <AnthropicJobs />
      {isOwner && <OppdJobs />}
      {isOwner && <HRBlockJobs />}
      {isOwner && <NetsmartJobs />}
      <GMJobs />
      <PinterestJobs />
      <AirbnbJobs />
      <DatadogJobs />
    </div>
  );
}
