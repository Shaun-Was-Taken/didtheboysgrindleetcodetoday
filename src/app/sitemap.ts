import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/jobs", priority: 0.9, changeFrequency: "hourly" },
    { path: "/quiz", priority: 0.6, changeFrequency: "monthly" },
    { path: "/groups", priority: 0.5, changeFrequency: "monthly" },
    { path: "/upgrade", priority: 0.5, changeFrequency: "monthly" },
    { path: "/upload", priority: 0.4, changeFrequency: "monthly" },
  ];
  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
