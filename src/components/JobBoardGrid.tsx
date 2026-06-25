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

export default function JobBoardGrid() {
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
      <GarminJobs />
      <AmazonJobs />
      <MicrosoftJobs />
      <AtlassianJobs />
      <WellSkyJobs />
      <TMobileJobs />
      <GoogleJobs />
      <NvidiaJobs />
      <SalesforceJobs />
      <StripeJobs />
      <DatabricksJobs />
      <AppleJobs />
      <OpenAIJobs />
      <AnthropicJobs />
      <OppdJobs />
    </div>
  );
}
