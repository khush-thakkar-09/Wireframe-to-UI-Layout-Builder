import express from "express";
import cors from "cors";
import { getProjectCms, updateProjectSectionElements } from "./cms-mongo.js";
import { logger } from "../utils/logger.js";

const app = express();
const PORT = 5001;

// Enable CORS so the React frontend (running on e.g. port 5173) can talk to us
app.use(cors());
app.use(express.json());

// 1. GET /api/cms/:projectId
app.get("/api/cms/:projectId", async (req, res): Promise<void> => {
  const { projectId } = req.params;
  logger.info("CMS Server", `GET request received for project: ${projectId}`);

  try {
    const doc = await getProjectCms(projectId);
    if (!doc) {
      logger.warn("CMS Server", `Project not found: ${projectId}`);
      res.status(404).json({ error: "Project CMS not found" });
      return;
    }

    res.json({
      db_records: doc.sections,
    });
  } catch (err) {
    logger.error("CMS Server", `Failed to get CMS: ${(err as Error).message}`);
    res.status(500).json({ error: (err as Error).message });
  }
});

// 2. POST /api/cms/:projectId/section/:sectionId/update
app.post("/api/cms/:projectId/section/:sectionId/update", async (req, res): Promise<void> => {
  const { projectId, sectionId } = req.params;
  const { elements } = req.body;
  logger.info("CMS Server", `POST update received for project: ${projectId}, section: ${sectionId}`);

  try {
    if (!elements || !Array.isArray(elements)) {
      res.status(400).json({ error: "Invalid elements array payload" });
      return;
    }

    const updated = await updateProjectSectionElements(projectId, sectionId, elements);
    if (updated) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Project or section not found to update" });
    }
  } catch (err) {
    logger.error("CMS Server", `Failed to update CMS: ${(err as Error).message}`);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Start the server
app.listen(PORT, () => {
  logger.success("CMS Server", `CMS Server is running on http://localhost:${PORT}`);
});
