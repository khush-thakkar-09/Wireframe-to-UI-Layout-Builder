import { ObjectId } from "mongodb";
import { connectToMongoDB } from "../database/mongo.js";
import { logger } from "../utils/logger.js";
export interface CmsSectionRecord {
  metadata: {
    sectionId: string;
    sectionName: string;
    sectionStatus: string;
    variations: number;
    sectionType: string;
    path: string;
    isAiGenerated: boolean;
    pageName: string;
    index: number;
    [key: string]: any;
  };
  elements: Array<{
    sectionId: string;
    elementName: string;
    fieldId: string;
    content: string;
    contentType: string;
    section: string;
    projectName: string;
    pageName: string;
    isCustom: boolean;
    isCustomEdit: boolean;
    loop?: Array<{
      [key: string]: any;
    }>;
  }>;
}

/**
 * Saves the entire project CMS to the 'wireframe-to-layout' database in separate collections:
 * - 'section-metadata' for section documents
 * - 'section-elements' for element documents
 */
export async function saveProjectCms(projectId: string, sections: any[]) {
  try {
    const mongoClient = await connectToMongoDB();
    // Connect to the specific database 'wireframe-to-layout'
    const db = mongoClient.db("wireframe-to-layout");

    const metadataCol = db.collection("section-metadata");
    const elementsCol = db.collection("section-elements");

    // Clean up existing records for this project first to avoid duplicates
    // We identify records by project ID (projectName in elements)
    const existingElements = await elementsCol.find({ projectName: projectId }).toArray();
    if (existingElements.length > 0) {
      const sectionIdsToClean = Array.from(new Set(existingElements.map(e => e.sectionId)));
      await elementsCol.deleteMany({ projectName: projectId });
      await metadataCol.deleteMany({ sectionId: { $in: sectionIdsToClean } });
    }

    // Create a common pageId for this project run
    const pageId = new ObjectId("6a3539349515b30524eb90f0");

    for (let index = 0; index < sections.length; index++) {
      const record = sections[index]!;
      
      const pageSectionId = new ObjectId();

      // 1. Prepare and save Section Metadata Document
      const sectionMetaDoc = {
        _id: pageSectionId,
        sectionId: record.metadata.sectionId,
        sectionName: record.metadata.sectionName,
        sectionStatus: record.metadata.sectionStatus || "Active",
        variations: record.metadata.variations || 1,
        sectionType: record.metadata.sectionType || "",
        path: record.metadata.path || `/client/${projectId}/${record.metadata.sectionName}/Variation1`,
        isAiGenerated: true,
        pageId: pageId,
        pageName: record.metadata.pageName || "home",
        index: record.metadata.index || (index + 1),
      };

      await metadataCol.insertOne(sectionMetaDoc);

      // 2. Prepare and save Element Documents
      const elementDocs = record.elements.map((elem: any) => {
        const doc: any = {
          sectionId: record.metadata.sectionId,
          elementName: elem.elementName,
          fieldId: elem.fieldId,
          content: elem.content || "",
          contentType: elem.contentType,
          section: record.metadata.sectionName,
          projectName: projectId,
          pageId: pageId,
          pageName: record.metadata.pageName || "home",
          isCustom: true,
          isCustomEdit: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          pageSectionId: pageSectionId,
        };

        if (elem.contentType === "Cards") {
          doc.loop = elem.loop || [];
        }

        return doc;
      });

      if (elementDocs.length > 0) {
        await elementsCol.insertMany(elementDocs);
      }
    }

    logger.success("MongoDB", `Successfully saved project CMS to 'wireframe-to-layout' collections for: ${projectId}`);
  } catch (err) {
    logger.error("MongoDB", `Failed to save project CMS: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Retrieves the project CMS from 'wireframe-to-layout' collections and reconstructs the structure.
 */
export async function getProjectCms(projectId: string): Promise<any | null> {
  try {
    const mongoClient = await connectToMongoDB();
    const db = mongoClient.db("wireframe-to-layout");

    const metadataCol = db.collection("section-metadata");
    const elementsCol = db.collection("section-elements");

    // Fetch all elements for this project
    const elementDocs = await elementsCol.find({ projectName: projectId }).toArray();
    if (elementDocs.length === 0) {
      return null;
    }

    // Fetch all sections associated with these elements
    const pageSectionIds = Array.from(new Set(elementDocs.map(e => e.pageSectionId?.toString()).filter(Boolean))) as string[];
    const sectionDocs = await metadataCol.find({ _id: { $in: pageSectionIds.map(id => new ObjectId(id)) } }).toArray();

    // Map sections back to section record structure expected by helper and wrapper
    const sections = sectionDocs.map(meta => {
      const sectionElements = elementDocs.filter(e => e.pageSectionId?.toString() === meta._id.toString());
      return {
        metadata: {
          sectionId: meta.sectionId,
          sectionName: meta.sectionName,
          sectionStatus: meta.sectionStatus,
          variations: meta.variations,
          sectionType: meta.sectionType,
          path: meta.path,
          isAiGenerated: meta.isAiGenerated,
          pageId: meta.pageId,
          pageName: meta.pageName,
          index: meta.index,
        },
        elements: sectionElements.map(el => {
          const formattedEl: any = {
            sectionId: el.sectionId,
            elementName: el.elementName,
            fieldId: el.fieldId,
            content: el.content,
            contentType: el.contentType,
            section: el.section,
            projectName: el.projectName,
            pageId: el.pageId,
            pageName: el.pageName,
            isCustom: el.isCustom,
            isCustomEdit: el.isCustomEdit,
          };
          if (el.contentType === "Cards") {
            formattedEl.loop = el.loop;
          }
          return formattedEl;
        }),
      };
    });

    // Sort sections by index to preserve page order
    sections.sort((a, b) => (a.metadata.index || 0) - (b.metadata.index || 0));

    return {
      projectId,
      sections,
    };
  } catch (err) {
    logger.error("MongoDB", `Failed to fetch project CMS: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Updates a single section's elements inside the 'section-elements' collection.
 */
export async function updateProjectSectionElements(
  projectId: string,
  sectionId: string,
  elements: any[]
): Promise<boolean> {
  try {
    const mongoClient = await connectToMongoDB();
    const db = mongoClient.db("wireframe-to-layout");
    const elementsCol = db.collection("section-elements");

    // Loop through each element and update its content/loop in the DB
    let updatedCount = 0;
    for (const elem of elements) {
      const updateDoc: any = {
        content: elem.content || "",
        updatedAt: new Date(),
      };
      if (elem.contentType === "Cards") {
        updateDoc.loop = elem.loop || [];
      }

      const result = await elementsCol.updateOne(
        { projectName: projectId, sectionId: sectionId, fieldId: elem.fieldId },
        { $set: updateDoc }
      );
      if (result.modifiedCount > 0) {
        updatedCount++;
      }
    }

    logger.success("MongoDB", `Updated ${updatedCount} elements in section ${sectionId} for project ${projectId}`);
    return true;
  } catch (err) {
    logger.error("MongoDB", `Failed to update section elements: ${(err as Error).message}`);
    throw err;
  }
}
