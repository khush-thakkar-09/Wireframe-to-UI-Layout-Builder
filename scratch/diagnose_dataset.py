import json
from collections import defaultdict
import os

def diagnose_dataset():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    annotation_path = os.path.join(base_dir, "Annotation_Testing", "_annotations.coco.json")
    if not os.path.exists(annotation_path):
        print(f"Error: Annotation file not found at {annotation_path}")
        return

    print("Loading annotations...")
    with open(annotation_path, 'r') as f:
        data = json.load(f)

    # 1. Map category IDs to names
    categories = {cat['id']: cat['name'] for cat in data['categories']}
    print("\n--- Categories Mapping ---")
    for cid, name in categories.items():
        print(f"ID {cid}: {name}")

    # 2. Class Distribution
    annotations = data['annotations']
    class_counts = defaultdict(int)
    for ann in annotations:
        class_counts[ann['category_id']] += 1

    total_annotations = len(annotations)
    print(f"\nTotal Bounding Boxes: {total_annotations}")
    print("\n--- Class Distribution ---")
    for cid, name in categories.items():
        count = class_counts[cid]
        percentage = (count / total_annotations) * 100 if total_annotations > 0 else 0
        print(f"{name.ljust(20)}: {count} ({percentage:.1f}%)")

    # 3. Analyze Image Annotations (Nesting and nesting ratios)
    # Group annotations by image
    image_annots = defaultdict(list)
    for ann in annotations:
        image_annots[ann['image_id']].append(ann)

    container_classes = {"Action_Button", "Input_Container"}
    total_containers = 0
    containers_with_children = 0
    containers_without_children = 0

    print("\nAnalyzing containment patterns...")

    for img_id, anns in image_annots.items():
        # Represent boxes as: (x1, y1, x2, y2, cat_name, id)
        boxes = []
        for ann in anns:
            x, y, w, h = ann['bbox']
            boxes.append({
                'id': ann['id'],
                'class': categories[ann['category_id']],
                'x1': x,
                'y1': y,
                'x2': x + w,
                'y2': y + h,
                'w': w,
                'h': h
            })

        for i, boxA in enumerate(boxes):
            if boxA['class'] in container_classes:
                total_containers += 1
                has_child = False
                for j, boxB in enumerate(boxes):
                    if i == j:
                        continue
                    # Check containment (B inside A)
                    # Let's consider B contained in A if at least 90% of B's area is inside A
                    x_left = max(boxA['x1'], boxB['x1'])
                    y_top = max(boxA['y1'], boxB['y1'])
                    x_right = min(boxA['x2'], boxB['x2'])
                    y_bottom = min(boxA['y2'], boxB['y2'])

                    if x_right > x_left and y_bottom > y_top:
                        intersection = (x_right - x_left) * (y_bottom - y_top)
                        areaB = boxB['w'] * boxB['h']
                        if (intersection / areaB) >= 0.90:
                            has_child = True
                            break
                
                if has_child:
                    containers_with_children += 1
                else:
                    containers_without_children += 1

    print("\n--- Nested Element Consistency ---")
    print(f"Total buttons/inputs checked: {total_containers}")
    if total_containers > 0:
        with_pct = (containers_with_children / total_containers) * 100
        without_pct = (containers_without_children / total_containers) * 100
        print(f"Containers with nested elements inside: {containers_with_children} ({with_pct:.1f}%)")
        print(f"Containers with NO nested elements inside: {containers_without_children} ({without_pct:.1f}%)")
        
        # Diagnostic warning
        if 20.0 <= with_pct <= 80.0:
            print("\n⚠️ WARNING: Nested elements inside buttons/inputs are annotated inconsistently!")
            print("In some cases you annotated buttons with text inside, and in other cases you did not.")
            print("This strongly confuses DETR models because they learn conflicting visual cues for containers.")

    # 4. Bounding Box Sizes & Aspect Ratio Analysis
    print("\n--- Bounding Box Dimensional Outliers ---")
    for cid, name in categories.items():
        widths = []
        heights = []
        for ann in annotations:
            if ann['category_id'] == cid:
                _, _, w, h = ann['bbox']
                widths.append(w)
                heights.append(h)
        
        if widths:
            avg_w = sum(widths) / len(widths)
            avg_h = sum(heights) / len(heights)
            min_w, max_w = min(widths), max(widths)
            min_h, max_h = min(heights), max(heights)
            print(f"{name.ljust(20)}: Avg Size: {avg_w:.1f}x{avg_h:.1f} | Min: {min_w:.1f}x{min_h:.1f} | Max: {max_w:.1f}x{max_h:.1f}")

if __name__ == "__main__":
    diagnose_dataset()
