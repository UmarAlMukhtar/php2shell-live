import React from "react";
import { Composition, registerRoot } from "remotion";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";
import { DURATION, Main } from "./Root";

loadSpaceGrotesk();
loadJetBrainsMono();

const Root: React.FC = () => (
  <Composition
    id="Main"
    component={Main}
    durationInFrames={DURATION}
    fps={30}
    width={1920}
    height={1080}
  />
);

registerRoot(Root);
