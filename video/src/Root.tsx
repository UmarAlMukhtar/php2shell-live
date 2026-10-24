import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { SCENE, TOTAL_SEC } from "./constants";
import { HookScene } from "./scenes/HookScene";
import { RevealScene } from "./scenes/RevealScene";
import { ClimaxScene, CloseScene, DefendScene, ForensicsScene, MultiplayerScene, VisualizeScene } from "./scenes/ShowcaseScenes";

const sceneMap = {
  hook: HookScene,
  reveal: RevealScene,
  visualize: VisualizeScene,
  forensics: ForensicsScene,
  defend: DefendScene,
  multiplayer: MultiplayerScene,
  climax: ClimaxScene,
  close: CloseScene,
};

export const Main: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {(Object.keys(sceneMap) as (keyof typeof sceneMap)[]).map((k) => {
        const Comp = sceneMap[k];
        const s = SCENE[k];
        return (
          <Sequence key={k} from={Math.round(s.start * fps)} durationInFrames={Math.round(s.duration * fps)} premountFor={fps}>
            <Comp />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const DURATION = Math.round(TOTAL_SEC * 30);
