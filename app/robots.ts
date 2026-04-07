import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/data/", "/api/"],
      },
      {
        userAgent: [
          "MJ12bot",
          "AhrefsBot",
          "SemrushBot",
          "DotBot",
          "MegaIndex",
          "BLEXBot",
        ],
        disallow: "/",
      },
    ],
    sitemap: "https://gichul.jttax.co.kr/sitemap.xml",
  };
}
