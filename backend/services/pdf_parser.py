import fitz  # PyMuPDF
import io
import re
from datetime import datetime

# Try to import OCR libraries — optional, only needed for scanned PDFs
try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("⚠️  pytesseract/Pillow not available — OCR disabled. Digital PDFs still work.")

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = text.strip()
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    text = re.sub(r'[^\x20-\x7E\n\r\t]', ' ', text)
    return text

def parse_pdf(file_bytes: bytes) -> dict:
    try:
        pdf_document = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        print(f"Error opening PDF: {e}")
        raise ValueError("Invalid or corrupted PDF file")

    total_pages = pdf_document.page_count
    pages_data = []
    digital_pages = 0
    ocr_pages = 0
    empty_pages = 0

    for page_num in range(total_pages):
        page = pdf_document.load_page(page_num)

        # Method A: Digital text extraction (always works)
        try:
            raw_text = page.get_text("text")
            cleaned_text = clean_text(raw_text)
            char_count = len(cleaned_text)

            if char_count >= 50:
                method_used = "digital"
                digital_pages += 1
            elif TESSERACT_AVAILABLE:
                # Method B: OCR fallback (only if tesseract is installed)
                mat = fitz.Matrix(2.0, 2.0)
                pix = page.get_pixmap(matrix=mat)
                img_bytes = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_bytes))

                config = "--oem 3 --psm 6"
                try:
                    ocr_raw_text = pytesseract.image_to_string(img, lang="eng", config=config)
                    cleaned_text = clean_text(ocr_raw_text)
                except Exception as ocr_e:
                    print(f"OCR failed for page {page_num + 1}: {ocr_e}")
                    cleaned_text = ""

                char_count = len(cleaned_text)
                method_used = "ocr"
                ocr_pages += 1
            else:
                # No OCR available — mark as low-content page
                method_used = "digital_low"
                ocr_pages += 1

        except Exception as e:
            print(f"Error processing page {page_num + 1}: {e}")
            cleaned_text = ""
            char_count = 0
            method_used = "error"

        is_empty = char_count < 20
        if is_empty:
            empty_pages += 1

        pages_data.append({
            "page_num": page_num + 1,
            "text": cleaned_text,
            "method_used": method_used,
            "char_count": char_count,
            "is_empty": is_empty
        })

    pdf_document.close()

    full_text_parts = []
    for p in pages_data:
        full_text_parts.append(f"--- PAGE {p['page_num']} ---\n\n{p['text']}")

    full_text = "\n\n".join(full_text_parts)

    return {
        "total_pages": total_pages,
        "pages": pages_data,
        "full_text": full_text,
        "digital_pages": digital_pages,
        "ocr_pages": ocr_pages,
        "empty_pages": empty_pages,
        "parsed_at": datetime.utcnow().isoformat()
    }
