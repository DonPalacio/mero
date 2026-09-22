import { createFileRoute } from "@tanstack/react-router";
import SidebarDemo from "@/components/sidebar-demo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sidebar Demo — Acet Labs" },
      {
        name: "description",
        content:
          "An animated collapsible sidebar demo with desktop hover-expand and mobile drawer navigation.",
      },
      { property: "og:title", content: "Sidebar Demo — Acet Labs" },
      {
        property: "og:description",
        content:
          "An animated collapsible sidebar demo with desktop hover-expand and mobile drawer navigation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return <SidebarDemo />;
}
