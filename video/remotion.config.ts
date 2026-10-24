import { Config } from "@remotion/cli/config";

// Single canonical asset source: the checked-in docs/media screenshots.
Config.setPublicDir("../docs/media");
Config.setChromiumOpenGlRenderer("angle");
