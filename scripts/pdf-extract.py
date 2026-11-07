import sys
import json
import os
import pypdf

def process_pdf(pdf_path):
    try:
        reader = pypdf.PdfReader(pdf_path)
        all_text = []
        image_paths = []
        
        tmp_dir = "/tmp"
        
        for p_idx, page in enumerate(reader.pages):
            # 1. Try extracting text
            t = page.extract_text()
            if t and t.strip():
                all_text.append(t.strip())
                
            # 2. Extract embedded images (for scanned/photo PDFs)
            try:
                for img_idx, img in enumerate(page.images):
                    ext = "png"
                    if img.name.lower().endswith(".jpg") or img.name.lower().endswith(".jpeg"):
                        ext = "jpg"
                    out_name = f"pdf_extracted_{os.getpid()}_{p_idx}_{img_idx}.{ext}"
                    out_path = os.path.join(tmp_dir, out_name)
                    with open(out_path, "wb") as f:
                        f.write(img.data)
                    image_paths.append(out_path)
            except Exception as e:
                sys.stderr.write(f"Image extraction warning: {e}\n")
                
        full_text = "\n\n".join(all_text)
        
        result = {
            "success": True,
            "hasText": len(full_text.strip()) > 50,
            "text": full_text,
            "imagePaths": image_paths
        }
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "hasText": False,
            "text": "",
            "imagePaths": []
        }))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No PDF path provided"}))
        sys.exit(1)
    process_pdf(sys.argv[1])
