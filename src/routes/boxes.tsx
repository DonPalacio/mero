import { createFileRoute } from "@tanstack/react-router";
import Boxes from "@/features/boxes/Boxes";

export const Route = createFileRoute("/boxes")({
  component: Boxes,
});
