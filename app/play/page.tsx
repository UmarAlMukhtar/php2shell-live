import { Suspense } from "react";
import { Multiplayer } from "@/components/Multiplayer";

export default function PlayPage() {
  return (
    <Suspense>
      <Multiplayer />
    </Suspense>
  );
}
