import {Config} from '@remotion/cli/config';

// Lumin Studio render defaults. Every render runs on Modal (CLAUDE.md §2A) — this file is read by the
// Remotion CLI both in a session (stills, short tests) and inside the Modal render containers.
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
// 'angle' fails in headless cloud containers; 'swangle' (software ANGLE) is measured to work in both.
Config.setChromiumOpenGlRenderer('swangle');
