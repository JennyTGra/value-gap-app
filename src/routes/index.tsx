import { createFileRoute } from "@tanstack/react-router";
import ValueGapApp from "@/components/ValueGapApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ValueGap — ett lugnt steg om dagen" },
      { name: "description", content: "Integritetsfokuserad fokusassistent: två val om dagen mot ditt stora mål. Allt sparas lokalt." },
      { property: "og:title", content: "ValueGap — ett lugnt steg om dagen" },
      { property: "og:description", content: "Två val om dagen mot ditt stora mål. Allt sparas lokalt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ValueGapApp,
});
