import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { fileURLToPath } from "url";

import { RenderRequest, ProgressRequest } from "../../src/features/video-editor-v7/editor/types";
import { startRendering } from "../../src/features/video-editor-v7/editor/ssr-helpers/custom-renderer";
import { getRenderState } from "../../src/features/video-editor-v7/editor/ssr-helpers/render-state";

const app = express();
const PORT = Number(process.env.REMOTION_SERVER_PORT || 4000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VIDEOS_DIR = path.join(process.cwd(), "public", "rendered-videos");

app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json({ limit: "25mb" }));

if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

const validate =
  <Schema extends z.ZodTypeAny>(schema: Schema) =>
  (payload: unknown) => {
    return schema.parse(payload);
  };

app.post("/api/latest/ssr/render", async (req, res) => {
  try {
    const body = validate(RenderRequest)(req.body);
    console.log("[Remotion] render request received", { id: body.id, inputPropsKeys: Object.keys(body.inputProps) });
    const renderId = await startRendering(body.id, body.inputProps);
    console.log("[Remotion] render started", { renderId });
    res.json({
      type: "success",
      data: {
        renderId,
      },
    });
  } catch (error) {
    console.error("[Remotion] render error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[Remotion] error stack:", errorStack);
    res.status(500).json({
      type: "error",
      message: errorMessage || "Render failed",
    });
  }
});

app.post("/api/latest/ssr/progress", async (req, res) => {
  try {
    const body = validate(ProgressRequest)(req.body);
    const state = getRenderState(body.id);
    if (!state) {
      res.json({
        type: "error",
        message: `No render found with ID: ${body.id}`,
      });
      return;
    }

    if (state.status === "error") {
      res.json({
        type: "error",
        message: state.error || "Unknown error occurred",
      });
      return;
    }

    if (state.status === "done") {
      res.json({
        type: "success",
        data: {
          type: "done",
          url: state.url,
          size: state.size,
        },
      });
      return;
    }

    res.json({
      type: "success",
      data: {
        type: "progress",
        progress: state.progress || 0,
      },
    });
  } catch (error) {
    console.error("[Remotion] progress error", error);
    res.status(500).json({
      type: "error",
      message: (error as Error).message ?? "Progress check failed",
    });
  }
});

app.get("/api/latest/ssr/download/:id", (req, res) => {
  const { id } = req.params;
  const videoPath = path.join(VIDEOS_DIR, `${id}.mp4`);

  if (!fs.existsSync(videoPath)) {
    res.status(404).send("Video not found");
    return;
  }

  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Disposition", `attachment; filename="${id}.mp4"`);
  const stream = fs.createReadStream(videoPath);
  stream.pipe(res);
});

app.use(
  "/rendered-videos",
  express.static(path.join(process.cwd(), "public", "rendered-videos"))
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`[Remotion] render server running on http://localhost:${PORT}`);
  console.log(`[Remotion] videos directory: ${VIDEOS_DIR}`);
  console.log(`[Remotion] cwd: ${process.cwd()}`);
});

