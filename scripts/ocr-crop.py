import sys
import os
from PIL import Image
import numpy as np

def crop_document(input_path, output_path):
    try:
        im = Image.open(input_path).convert('L')
        arr = np.array(im)
        h, w = arr.shape
        
        # If image is very small or already cropped, just upscale and contrast
        if w < 400 or h < 400:
            upscaled = Image.open(input_path).resize((w * 2, h * 2), Image.Resampling.LANCZOS)
            upscaled.save(output_path)
            return output_path

        # Ignore margins for UI bars (e.g. WhatsApp / browser viewers)
        y_top = min(50, int(h * 0.12))
        y_bot = max(h - 70, int(h * 0.88))
        inner = arr[y_top:y_bot, :]

        # Look for white/light paper background
        col_means = inner.mean(axis=0)
        doc_cols = np.where(col_means > 115)[0]
        
        if len(doc_cols) > 50:
            cmin, cmax = int(doc_cols.min()), int(doc_cols.max())
            # Search within those columns for the rows of the document
            doc_rows = np.where(inner[:, cmin:cmax].mean(axis=1) > 115)[0]
            if len(doc_rows) > 50:
                rmin = int(doc_rows.min() + y_top)
                rmax = int(doc_rows.max() + y_top)
                
                # Add small padding
                cmin = max(0, cmin - 5)
                cmax = min(w, cmax + 5)
                rmin = max(0, rmin - 5)
                rmax = min(h, rmax + 5)
                
                cropped = Image.open(input_path).crop((cmin, rmin, cmax, rmax))
                # Resize for optimal OCR DPI (aim for width around 1800 - 2400)
                scale = max(1.5, min(3.0, 1800.0 / cropped.width))
                new_w = int(cropped.width * scale)
                new_h = int(cropped.height * scale)
                enhanced = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
                enhanced.save(output_path)
                return output_path

        # Fallback: upscale original
        upscaled = Image.open(input_path).resize((w * 2, h * 2), Image.Resampling.LANCZOS)
        upscaled.save(output_path)
        return output_path
    except Exception as e:
        sys.stderr.write(f"Crop error: {e}\n")
        # Save as is
        Image.open(input_path).save(output_path)
        return output_path

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 ocr-crop.py <input> <output>")
        sys.exit(1)
    crop_document(sys.argv[1], sys.argv[2])
