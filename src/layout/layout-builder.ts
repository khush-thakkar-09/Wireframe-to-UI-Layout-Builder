import { logger } from "../utils/logger.js";
import type { EnrichedDetection, LayoutNode, BoundingBox } from "../types/index.js";

/**
 * Calculates the area of a bounding box.
 */
function calculateArea(box: BoundingBox): number {
  return box.width * box.height;
}

/**
 * Checks if boxA is nested inside boxB.
 * Specifically: if the overlap area of boxA and boxB is >= 90% of the area of the smaller box (boxA).
 */
function isNested(boxA: BoundingBox, boxB: BoundingBox): boolean {
  // Find intersection coordinates
  const xLeft = Math.max(boxA.x, boxB.x);
  const yTop = Math.max(boxA.y, boxB.y);
  const xRight = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
  const yBottom = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

  if (xRight <= xLeft || yBottom <= yTop) {
    return false;
  }

  const intersectionArea = (xRight - xLeft) * (yBottom - yTop);
  const areaA = calculateArea(boxA);
  const areaB = calculateArea(boxB);
  
  // Smaller box is the potential nested child
  const smallerArea = Math.min(areaA, areaB);

  // If the intersection represents >= 90% of the smaller box's area, they are nested
  return (intersectionArea / smallerArea) >= 0.90;
}

/**
 * Custom sort comparator for layout components.
 * Sorts primarily by y (descending - top to bottom) and secondarily by x (ascending - left to right).
 * Note: Since you specified descending for Y, elements higher up on the screen (smaller Y) are at the top,
 * which is descending relative to vertical value increase, and X is ascending.
 */
export function compareLayoutNodes(a: LayoutNode, b: LayoutNode): number {
  // Top-to-bottom sorting: smaller Y coordinate comes first.
  if (a.boundingBox.y !== b.boundingBox.y) {
    return a.boundingBox.y - b.boundingBox.y;
  }
  // Left-to-right sorting: smaller X coordinate comes first.
  return a.boundingBox.x - b.boundingBox.x;
}

/**
 * Organizes a flat list of enriched detections into a sorted hierarchical parent-child tree.
 * Elements that are nested >= 90% are placed in the children array of their parent.
 */
export function buildLayoutTree(detections: EnrichedDetection[]): LayoutNode[] {
  logger.info("Layout Builder", `Structuring ${detections.length} elements into hierarchical tree...`);

  // 1. Initialise all detections as independent LayoutNodes
  const nodes: LayoutNode[] = detections.map((det) => ({
    ...det,
    children: [],
  }));

  // Sort nodes by area descending so that larger containers are processed first
  const sortedByArea = [...nodes].sort((a, b) => {
    return calculateArea(b.boundingBox) - calculateArea(a.boundingBox);
  });

  const roots: LayoutNode[] = [];
  const assignedChildren = new Set<string>();

  // 2. Identify parent-child nesting relationships
  for (let i = 0; i < sortedByArea.length; i++) {
    const candidateChild = sortedByArea[i]!;
    
    // Find the smallest container that fully wraps this child
    let bestParent: LayoutNode | null = null;
    let bestParentArea = Infinity;

    for (let j = 0; j < sortedByArea.length; j++) {
      if (i === j) continue;
      const potentialParent = sortedByArea[j]!;

      // Potential parent must be strictly larger than candidate child
      const parentArea = calculateArea(potentialParent.boundingBox);
      const childArea = calculateArea(candidateChild.boundingBox);
      if (parentArea <= childArea) continue;

      if (isNested(candidateChild.boundingBox, potentialParent.boundingBox)) {
        if (parentArea < bestParentArea) {
          bestParent = potentialParent;
          bestParentArea = parentArea;
        }
      }
    }

    if (bestParent) {
      bestParent.children = bestParent.children || [];
      bestParent.children.push(candidateChild);
      assignedChildren.add(candidateChild.id);
    } else {
      roots.push(candidateChild);
    }
  }

  // Filter root elements (those which were not assigned to any parent)
  const rootNodes = nodes.filter((node) => !assignedChildren.has(node.id));

  // 3. Recursively sort the tree (roots and nested children) using Y (descending) & X (ascending) logic
  const sortTree = (nodeList: LayoutNode[]) => {
    nodeList.sort(compareLayoutNodes);
    for (const node of nodeList) {
      if (node.children && node.children.length > 0) {
        sortTree(node.children);
      } else {
        // Clean up empty children arrays from final JSON output
        delete node.children;
      }
    }
  };

  sortTree(rootNodes);

  logger.success("Layout Builder", `Tree build complete. Created ${rootNodes.length} root elements.`);
  return rootNodes;
}
