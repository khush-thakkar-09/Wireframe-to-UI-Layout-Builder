---
language: en
license: mit
tags:
  - object-detection
  - ui-detection
  - computer-vision
  - rf-detr
  - detection-transformer
  - autonomous-agent
  - computer-use
spaces:
  - racineai/UI-DETR-1
metrics:
  - accuracy
  - mean_average_precision
  - accuracy
  - mean_average_precision
  - precision
  - recall
library_name: transformers
pipeline_tag: object-detection
model-index:
- name: UI-DETR-1 RF-DETR-M UI Detection
  results:
  - task:
      type: object-detection
      name: UI Element Detection
    dataset:
      name: WebClick Benchmark
      type: Hcompany/WebClick
    metrics:
    - type: accuracy
      value: 70.8
      name: Click Accuracy

---
# UI-DETR-1: RF-DETR-M for Computer Use Agent

## Model Description

**UI-DETR-1** (Computer Use Agent v1) is a fine-tuned implementation of RF-DETR-M specifically optimized for autonomous computer interaction. This model serves as the visual perception backbone for our computer use agent, enabling real-time UI element detection and multi-action task automation across diverse graphical interfaces.

[![Open in Spaces](https://huggingface.co/datasets/huggingface/badges/resolve/main/open-in-hf-spaces-sm.svg)](https://huggingface.co/spaces/racineai/UI-DETR-1)

**Key Features:**
- **70.8% accuracy** on WebClick benchmark (vs 58.8% for OmniParser)
- Multi-action task support beyond single-click benchmarks
- Optimized training pipeline with merged COCO-format datasets
- Class-agnostic detection supporting diverse UI elements




## Methodology Revision Notice

**Important:** This paper presents revised benchmark results following a methodological correction. Our initial evaluation used default YOLO detection parameters and baseline prompts, which do not reflect optimal performance conditions for either model. We subsequently re-evaluated both UI-DETR-1 and OmniParser V2 using their respective optimized detection thresholds (0.35 for UI-DETR-1, 0.05 for OmniParser V2 from official sources) and refined prompts for improved task instruction clarity. Both sets of results are presented for transparency, with the optimized evaluation better representing real-world deployment scenarios where parameters and prompts are tuned for specific use cases.

## Training Architecture

### Dataset Architecture

The model is trained on a merged COCO-format dataset combining multiple UI detection sources, ensuring broad coverage across platforms, applications, and visual styles. The class-agnostic approach enables detection of any clickable element without predefined categories.

**Training Dataset Composition:**

| Dataset                        | Train | Valid | Test | Total |
|--------------------------------|-------|-------|------|-------|
| months.v1i.coco                | 173   | 25    | 12   | 210   |
| all-item-merged.v1-100-60.coco | 334   | 35    | 14   | 383   |
| Web.v3i.coco                   | 493   | 264   | 90   | 847   |
| Website elements.v3i.coco      | 133   | 10    | 3    | 146   |
| Website Elements.v16i.coco     | 679   | 55    | 21   | 755   |
| Website.v1i.coco               | 844   | 242   | 123  | 1,209 |
| **TOTAL**                      | **2,656** | **631** | **263** | **3,550** |

**Training Configuration:**
- **Training images:** 2,656 annotated UI screenshots
- **Epochs:** 30
- **Batch size:** 8
- **Learning rate:** 5e-4

### WebClick Benchmark Evaluation

**Benchmark Methodology:** The WebClick benchmark evaluates whether models can correctly identify clickable elements at specified target coordinates. Each sample returns a binary result (success/failure), with the final accuracy calculated as the average across all samples.

Evaluation performed on **1,639 samples** across three categories using **Gemini 2.5 Pro** as the decision-making LLM.

#### Technical Parameters

**Detection Configuration:**
- **UI-DETR-1**:
  - Confidence threshold: 0.35
  - Model: RF-DETR-Medium
- **OmniParser**:
  - Confidence threshold: 0.05
  - IOU threshold: 0.1
  - Model: YOLOv8-based icon detection

**Annotation System:**
Both models use numbered bounding box annotations where each detected UI element is assigned a unique ID displayed above its bounding box. The LLM (Gemini 2.5 Pro) analyzes the annotated screenshot and selects elements by their ID numbers to perform click actions. Each bounding box is drawn with a thin border for visibility, with the ID number displayed in a black label box with white text positioned above each element.

**LLM Decision Process:**
The benchmark evaluates the agent in a constrained scenario where it must select a single element to click. The LLM receives:
1. A task instruction (e.g., "Click on March 19th in the calendar")
2. An annotated screenshot showing all detected elements with their IDs

The LLM is prompted to analyze the image and respond with a tool call in the format:
```json
{"name": "click", "parameters": {"id": <box_id>}}
```

Note that the full UI-DETR-1 agent supports multiple actions (`click`, `type`, `scroll`, `press`, `right_click`, `double_click`, etc.), but for benchmark consistency, only the `click` action is evaluated. This tests the fundamental capability of correctly identifying and selecting UI elements.

<img src="./img/annotation_bbc.jpg" width="800" alt="BBC News Annotation Example">

*Figure 1: BBC News website showing numbered annotations for all interactive elements including navigation items, article links, and media controls.*

<img src="./img/annotation_airbnb.jpg" width="800" alt="Airbnb Annotation Example">

*Figure 2: Airbnb search interface with numbered annotations on calendar dates, property listings, filters, and interactive controls.*

#### Results

| Metric | UI-DETR-1 (RF-DETR-M) | OmniParser | Improvement |
|--------|------------------|------------|-------------|
| **Overall Accuracy** | **70.8%** | 58.8% | **+20%** |
| Agent Browse | 66% | 58% | +14% |
| Calendars | 64% | 46% | **+39%** |
| Human Browse | 83% | 73% | +14% |

*Table 1: Performance comparison between UI-DETR-1 and OmniParser across WebClick benchmark categories (optimized parameters)*

**Methodology Note:**

Initial evaluation used default YOLO detection parameters, yielding OmniParser accuracy of 40.7%. Following parameter optimization (confidence threshold 0.05, IOU threshold 0.1 from official deployment configurations) and refined prompts, OmniParser improved to 58.8%. UI-DETR-1 improved from 67.5% to 70.8% solely through enhanced system prompts, maintaining its threshold of 0.35 throughout both evaluations.

<img src="./img/overall_old.png" width="700" alt="Initial vs Optimized Performance">

*Comparison showing impact of parameter optimization on OmniParser performance (40.7% → 58.8%)*

<img src="./img/category_old.png" width="700" alt="Category Performance Evolution">

*Category-level results demonstrating performance gains from optimized detection parameters and improved prompts*

**Category Breakdown:**
- **Agent Browse**: Automated navigation tasks requiring identification of typical web elements like buttons, links, and form fields
- **Calendars**: Date selection interfaces with dense grid layouts of small, similar-looking elements
- **Human Browse**: Real-world web browsing scenarios with diverse UI patterns and complex page structures

UI-DETR-1 shows particularly strong performance on **Calendar** tasks (+39% improvement), demonstrating superior ability to distinguish between densely packed, visually similar UI elements - a critical capability for autonomous agents.

**Detection Statistics:**
- **Average elements detected per image**: UI-DETR-1 detects 82.3 elements vs OmniParser's 50.6 elements
- **Processing time**: UI-DETR-1 averages 0.82s per image vs OmniParser's 0.77s

### Visual Performance Comparison

### Examples showing UI-DETR-1 (blue boxes) vs OmniParser (orange boxes) detection capabilities:

<img src="./img/boxes_calendar.png" width="900" alt="Detection Example 1">

*Figure 5: Calendar date selection interface with dual-month view (April-May 2026).*
*UI-DETR-1 detects 103 interactive elements including individual calendar dates for both months, navigation arrows, date input fields, and action buttons (Reset, Cancel, Apply), while OmniParser only identifies 47 elements, missing numerous calendar dates and form controls.*

<img src="./img/boxes_musique.png" width="900" alt="Detection Example 2">

*Figure 6: Spotify music streaming platform showing search results for artist "Gojira".*
*UI-DETR-1 identifies 98 elements including navigation tabs (Tracks, Albums, Playlists, Artists, Episodes, Profiles), individual track rows with action buttons (play, like, more options), artist information, and media controls, compared to OmniParser's 60 detections that miss several interactive elements and granular controls.*

### WebClick benchmark click decision examples with Gemini Pro 2.5 (green box: ground truth, blue: UI-DETR-1 selection, orange: OmniParser selection):

<img src="./img/click_calendar.png" width="600" alt="Click Decision 1">

*Figure 7: Travel booking website with flight search and calendar date picker (April-May 2025).*
***Query:** Click task on calendar interface*
*UI-DETR-1 correctly identifies and clicks the target date element (May 27th) within the dense calendar grid, while OmniParser fails to locate the correct date element.*

<img src="./img/click_hotel.png" width="600" alt="Click Decision 2">

*Figure 8: Booking.com accommodation search with stay duration selector.*
***Query:** Select stay duration option*
*UI-DETR-1 demonstrates superior fine-grained detection by accurately identifying both the "A month" text label and its associated radio button as separate interactive elements, enabling precise selection. OmniParser fails to detect these subtle UI components, missing the granular structure of the duration selector interface.*

**Benchmark Context:**

The WebClick benchmark evaluates single-click accuracy on web UI tasks. While our agent achieves 70.8% accuracy (compared to 58.8% for OmniParser), it's important to note that UI-DETR-1 is designed for **multi-action sequences** beyond the single-click paradigm:

- **Sequential Actions**: Screenshot before/after each action for context awareness
- **Complex Workflows**: Navigate through multi-step processes autonomously
- **Error Recovery**: Adaptive behavior based on UI state changes

<video src="https://cdn-uploads.huggingface.co/production/uploads/659826211ec4d9b9a1f2ef3a/V6PTmBzligR4Fo43hZK-5.qt" width="800" controls alt="Demo Agent Execution"></video>

*Video 1: Example of UI-DETR-1 agent performing a multi-step task requiring several sequential actions to achieve the final result.*

## Agent Architecture & Capabilities

### Visual Processing Pipeline

UI-DETR-1 powers a sophisticated computer use agent with multiple detection modes:

```python
# From agent_cv.py - Core processing loop
async def run_agent(user_query: str):
    # 1. Capture screenshot
    screenshot = capture_screenshot()

    # 2. Process with RF-DETR (UI-DETR-1)
    boxes, annotated, atlas = process_image(screenshot)

    # 3. Multiple methods to communicate detected elements to the LLM
    #    (visual annotations, coordinates, atlas grids, etc.)

    # 4. LLM decision making with visual context
    # 5. Execute action and capture result
```

## Agent System Architecture

UI-DETR-1 serves as the visual perception foundation for an autonomous computer use agent capable of complex multi-step interactions across any graphical interface.

### Key Differentiators

**Beyond Single-Click Benchmarks:**

While WebClick evaluates single-click accuracy, UI-DETR-1 excels at complex multi-action sequences:

```python
# Example: Multi-step form submission
user_query = "Fill out the registration form with my information"

# Agent performs:
# 1. Screenshot → Detect form fields
# 2. Click name field → Type name
# 3. Screenshot → Verify input
# 4. Click email field → Type email
# 5. Screenshot → Verify input
# 6. Select country dropdown → Choose option
# 7. Check agreement boxes
# 8. Click submit button
# 9. Screenshot → Confirm success
```

**Contextual Awareness:**

The agent maintains state across actions through before/after screenshots, enabling:
- Error detection and recovery
- Verification of action success
- Handling of semi-dynamic content

**LLM Integration:**

Seamless integration with vision-language models (Gemini, GPT-4V, Claude) for intelligent decision-making based on visual context and user intent.

## Model Usage

### Quick Start

The `model.pth` file contains the model weights. To use them, you need to install the required dependencies first:

```bash
# Core requirements
pip install torch torchvision opencv-python pillow

# RF-DETR library
pip install rfdetr
```

```python
from rfdetr.detr import RFDETRMedium
import cv2
import numpy as np

# Load the model with your trained weights
model = RFDETRMedium(pretrain_weights="model.pth", resolution=1600)

# Process an image
image = cv2.imread("screenshot.png")
image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

# Run detection
detections = model.predict(image_rgb, threshold=0.3)

# Get results
boxes = detections.xyxy  # Bounding boxes
scores = detections.confidence  # Confidence scores

print(f"Detected {len(boxes)} UI elements")
```

## Limitations & Future Work

**Current Limitations:**
- 70.8% single-click accuracy leaves room for improvement
- Performance degrades on very small UI elements (<20px)
- Limited to static screenshots (no video/animation support yet)

## Authors

**Léo Appourchaux** - Lead Developer at TW3 Partners  
**Noé Brandolini** - R&D at TW3 Partners - Student at École Centrale d'Électronique   
**David Soeiro-Vuong** - R&D at Racine.ai - Student at École Centrale d'Électronique  
**Matis Despujols** - R&D at TW3 Partners  
**Paul Lemaistre** - GD at Racine.ai – Adjunct Professor at École Centrale d'Électronique

## About Ecole Centrale d'Electronique:
ECE, a multi-program, multi-campus, and multi-sector engineering school specializing in digital engineering, trains engineers and technology experts for the 21st century, capable of meeting the challenges of the dual digital and sustainable development revolutions. [French Engineering School ECE](https://www.ece.fr/en/)

## Citations

### Model Citation
```bibtex
@misc{cu1-computer-use-agent-2025,
  author = {UI-DETR-1 Team},
  title = {UI-DETR-1: RF-DETR-M for Computer Use Agent},
  year = {2025},
  publisher = {Hugging Face},
  journal = {Hugging Face Model Hub},
  howpublished = {\url{https://huggingface.co/UI-DETR-1/rf-detr-computer-use}}
}
```

### Benchmark Dataset
```bibtex
@misc{webclick2024,
  title = {WebClick Dataset},
  type = {Benchmark Dataset},
  author = {Hcompany},
  howpublished = {\url{https://huggingface.co/datasets/Hcompany/WebClick}},
  journal = {Hugging Face Datasets},
  publisher = {Hugging Face},
  year = {2024}
}
```

### Training Datasets
```bibtex
@misc{months_dataset,
  title = {months Dataset},
  type = {Open Source Dataset},
  author = {YOLO},
  howpublished = {\url{https://universe.roboflow.com/yolo-ujkjn/months}},
  journal = {Roboflow Universe},
  publisher = {Roboflow},
  year = {2025},
  month = {jul}
}

@misc{all-item-merged_dataset,
  title = {all-item-merged Dataset},
  type = {Open Source Dataset},
  author = {pc},
  howpublished = {\url{https://universe.roboflow.com/pc-fjqbc/all-item-merged}},
  journal = {Roboflow Universe},
  publisher = {Roboflow},
  year = {2022},
  month = {sep}
}

@misc{web-l67bi_dataset,
  title = {Web Dataset},
  type = {Open Source Dataset},
  author = {Vitaliy Roshko},
  howpublished = {\url{https://universe.roboflow.com/vitaliy-roshko-fu9tw/web-l67bi}},
  journal = {Roboflow Universe},
  publisher = {Roboflow},
  year = {2025},
  month = {aug}
}

@misc{website-elements-aneyv_dataset,
  title = {Website elements Dataset},
  type = {Open Source Dataset},
  author = {Dibyajyoti Mohanty},
  howpublished = {\url{https://universe.roboflow.com/dibyajyoti-mohanty-eqerk/website-elements-aneyv}},
  journal = {Roboflow Universe},
  publisher = {Roboflow},
  year = {2024},
  month = {jun}
}

@misc{website-elements-064fn_dataset,
  title = {Website Elements Dataset},
  type = {Open Source Dataset},
  author = {workspace},
  howpublished = {\url{https://universe.roboflow.com/workspace-8hc0w/website-elements-064fn}},
  journal = {Roboflow Universe},
  publisher = {Roboflow},
  year = {2025},
  month = {aug}
}

@misc{website-vsoao_dataset,
  title = {website Dataset},
  type = {Open Source Dataset},
  author = {ai research},
  howpublished = {\url{https://universe.roboflow.com/ai-research-zk9sn/website-vsoao}},
  journal = {Roboflow Universe},
  publisher = {Roboflow},
  year = {2025},
  month = {aug}
}
```