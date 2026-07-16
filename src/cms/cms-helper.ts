import fs from "fs";
import path from "path";
import { generateCmsForSection } from "./cms-generator.js";
import { saveProjectCms } from "./cms-mongo.js";
import { logger } from "../utils/logger.js";
import type { Section } from "../sections/section-identifier.js";
import type { CmsSectionRecord } from "./cms-mongo.js";

/**
 * Converts a string to camelCase.
 */
function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");
}

/**
 * Orchestrates the full CMS generation for all sections of a project.
 */
export async function generateAndSaveCms(
  sections: Section[],
  imagePath: string,
  testingReactPath: string
): Promise<{ db_records: CmsSectionRecord[]; projectId: string }> {
  // Generate a project ID: imageName_randomUUID
  const imageName = path.basename(imagePath, path.extname(imagePath)).toLowerCase().replace(/[^a-z0-9]/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const projectId = `${imageName}_${randomSuffix}`;
  const projectName = imageName;
  const pageName = "home";

  logger.info("CMS Helper", `Initiating CMS generation for project: ${projectId}`);

  const db_records: CmsSectionRecord[] = [];

  let previousCmsSummary = "";

  for (let idx = 0; idx < sections.length; idx++) {
    const sect = sections[idx]!;
    
    // Generate CMS schema for this section
    const record = await generateCmsForSection(
      sect,
      idx + 1,
      projectName,
      pageName,
      previousCmsSummary
    );

    // Update previous sections context summary for the next section call
    previousCmsSummary += `Section ${idx + 1}: Name="${record.metadata.sectionName}", ID="${record.metadata.sectionId}", ElementsCount=${record.elements.length}\n`;
    
    db_records.push(record);

  }

  const cmsPayload = {
    db_records,
  };

  // 1. Save locally in testing_react/src/cms_data.json
  const localCmsPath = path.join(testingReactPath, "src", "cms_data.json");
  const localSrcDir = path.dirname(localCmsPath);
  if (!fs.existsSync(localSrcDir)) {
    fs.mkdirSync(localSrcDir, { recursive: true });
  }
  fs.writeFileSync(localCmsPath, JSON.stringify(cmsPayload, null, 2), "utf-8");
  logger.success("CMS Helper", `Saved local CMS fallback to: ${localCmsPath}`);

  // 2. Save in MongoDB (as a single document representing the project)
  await saveProjectCms(projectId, db_records);

  return {
    db_records,
    projectId,
  };
}
