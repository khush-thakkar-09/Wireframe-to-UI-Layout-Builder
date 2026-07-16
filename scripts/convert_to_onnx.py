"""
Convert RF-DETR-Medium model.pth to ONNX format.

This script loads the class-agnostic RF-DETR-Medium checkpoint (model.pth)
and exports it to ONNX format using the rfdetr library's built-in export
method. The exported model is saved to dist_model/model.onnx.

Requirements:
    pip install rfdetr torch torchvision onnx onnxruntime

Usage:
    python scripts/convert_to_onnx.py
"""

import os
import sys
import shutil

def main():
    # Resolve paths relative to project root (one level up from scripts/)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    weights_path = os.path.join(project_root, "model.pth")
    output_dir = os.path.join(project_root, "dist_model")
    # Temporary export directory (rfdetr exports to a directory, not a single file)
    temp_export_dir = os.path.join(project_root, "dist_model", "_onnx_export")
    
    # ─── Validate inputs ──────────────────────────────────────────────
    if not os.path.exists(weights_path):
        print(f"ERROR: model.pth not found at: {weights_path}")
        sys.exit(1)
    
    print(f"Model weights:  {weights_path}")
    print(f"Output dir:     {output_dir}")
    print(f"File size:      {os.path.getsize(weights_path) / 1e6:.1f} MB")
    print()
    
    # ─── Step 1: Load the model ───────────────────────────────────────
    print("Step 1: Loading RF-DETR-Medium with model.pth weights...")
    
    try:
        from rfdetr import RFDETRMedium
    except ImportError:
        print("ERROR: rfdetr package not installed. Run:")
        print("  pip install rfdetr")
        sys.exit(1)
    
    model = RFDETRMedium(pretrain_weights=weights_path, resolution=1600)
    print("  ✓ Model loaded successfully")
    print()
    
    # ─── Step 2: Export to ONNX ───────────────────────────────────────
    print("Step 2: Exporting to ONNX format (resolution=1600)...")
    print("  This may take a few minutes...")
    
    # Clean up any previous temp export
    if os.path.exists(temp_export_dir):
        shutil.rmtree(temp_export_dir)
    
    try:
        model.export(output_dir=temp_export_dir)
        print("  ✓ Export completed")
    except Exception as e:
        print(f"  ERROR during export: {e}")
        print()
        print("  Falling back to manual torch.onnx.export...")
        # If the built-in export fails, we'll handle it below
        manual_export(model, output_dir, weights_path)
        return
    
    # ─── Step 3: Move the ONNX file to dist_model/model.onnx ─────────
    print("Step 3: Locating exported ONNX file...")
    
    onnx_file = None
    for root, dirs, files in os.walk(temp_export_dir):
        for f in files:
            if f.endswith(".onnx"):
                onnx_file = os.path.join(root, f)
                break
        if onnx_file:
            break
    
    if not onnx_file:
        print("  ERROR: No .onnx file found in export output")
        print(f"  Contents of {temp_export_dir}:")
        for root, dirs, files in os.walk(temp_export_dir):
            for f in files:
                print(f"    {os.path.join(root, f)}")
        sys.exit(1)
    
    final_path = os.path.join(output_dir, "model.onnx")
    
    # Remove old model.onnx if it exists
    if os.path.exists(final_path):
        os.remove(final_path)
    
    shutil.move(onnx_file, final_path)
    print(f"  ✓ Moved to: {final_path}")
    print(f"  File size: {os.path.getsize(final_path) / 1e6:.1f} MB")
    
    # Clean up temp directory
    if os.path.exists(temp_export_dir):
        shutil.rmtree(temp_export_dir)
    
    print()
    
    # ─── Step 4: Delete old rfdetr-medium.onnx ────────────────────────
    old_model_path = os.path.join(output_dir, "rfdetr-medium.onnx")
    if os.path.exists(old_model_path):
        print("Step 4: Deleting old rfdetr-medium.onnx...")
        os.remove(old_model_path)
        print(f"  ✓ Deleted: {old_model_path}")
    else:
        print("Step 4: Old rfdetr-medium.onnx not found (already deleted)")
    print()
    
    # ─── Step 5: Validate with onnxruntime ────────────────────────────
    validate_onnx(final_path)
 
 
def manual_export(model, output_dir, weights_path):
    """
    Fallback: Manual torch.onnx.export if the built-in .export() fails.
    This handles cases where the rfdetr version has compatibility issues.
    """
    import torch
    import numpy as np
    
    print("  Attempting manual ONNX export with torch.onnx.export...")
    
    # Get the underlying PyTorch model
    pytorch_model = model.model if hasattr(model, 'model') else model
    pytorch_model.eval()
    
    # Create dummy input at resolution 1600
    dummy_input = torch.randn(1, 3, 1600, 1600)
    
    final_path = os.path.join(output_dir, "model.onnx")
    
    try:
        torch.onnx.export(
            pytorch_model,
            dummy_input,
            final_path,
            opset_version=17,
            input_names=["images"],
            output_names=["boxes", "scores"],
            dynamic_axes={
                "images": {0: "batch"},
                "boxes": {0: "batch"},
                "scores": {0: "batch"},
            },
        )
        print(f"  ✓ Manual export succeeded: {final_path}")
        print(f"  File size: {os.path.getsize(final_path) / 1e6:.1f} MB")
    except Exception as e:
        print(f"  ERROR: Manual export also failed: {e}")
        sys.exit(1)
    
    # Delete old model
    old_model_path = os.path.join(output_dir, "rfdetr-medium.onnx")
    if os.path.exists(old_model_path):
        print("  Deleting old rfdetr-medium.onnx...")
        os.remove(old_model_path)
        print(f"  ✓ Deleted: {old_model_path}")
    
    print()
    validate_onnx(final_path)


def validate_onnx(onnx_path):
    """Validate the exported ONNX model loads and runs inference correctly."""
    print("Step 5: Validating ONNX model with onnxruntime...")
    
    try:
        import onnxruntime as ort
        import numpy as np
    except ImportError:
        print("  WARNING: onnxruntime not installed, skipping validation")
        print("  Run: pip install onnxruntime")
        return
    
    try:
        session = ort.InferenceSession(onnx_path)
        
        # Print model input/output details
        print("  Input details:")
        for inp in session.get_inputs():
            print(f"    Name: {inp.name}, Shape: {inp.shape}, Type: {inp.type}")
        
        print("  Output details:")
        for out in session.get_outputs():
            print(f"    Name: {out.name}, Shape: {out.shape}, Type: {out.type}")
        
        # Run a dummy inference to verify the model works end-to-end
        input_info = session.get_inputs()[0]
        input_shape = input_info.shape
        
        # Replace dynamic dims with concrete values
        concrete_shape = []
        for dim in input_shape:
            if isinstance(dim, str) or dim is None:
                concrete_shape.append(1)  # batch size
            else:
                concrete_shape.append(dim)
        
        dummy_data = np.random.randn(*concrete_shape).astype(np.float32)
        
        print(f"  Running dummy inference with shape {concrete_shape}...")
        outputs = session.run(None, {input_info.name: dummy_data})
        
        print("  Output shapes:")
        output_names = [o.name for o in session.get_outputs()]
        for name, out in zip(output_names, outputs):
            print(f"    {name}: {out.shape}")
        
        print()
        print("  ✓ ONNX model validation PASSED")
        print()
        print("=" * 50)
        print("  MODEL CONVERSION COMPLETE")
        print(f"  Output: {onnx_path}")
        print("=" * 50)
        
    except Exception as e:
        print(f"  ERROR during validation: {e}")
        print("  The ONNX file was created but may have issues.")
        sys.exit(1)


if __name__ == "__main__":
    main()
