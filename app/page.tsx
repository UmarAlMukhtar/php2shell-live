import { Game } from "@/components/Game";
import { SimProvider } from "@/components/SimProvider";

export default function Home() {
  return (
    <SimProvider>
      <Game />
    </SimProvider>
  );
}
