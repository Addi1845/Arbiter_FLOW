import urllib.request
import urllib.parse
import json
import uuid

# Helper function for multipart form data
def post_multipart(url, file_path, file_type="application/pdf"):
    import mimetypes
    import os
    boundary = uuid.uuid4().hex
    headers = {'Content-Type': f'multipart/form-data; boundary={boundary}'}
    data = []
    
    with open(file_path, 'rb') as f:
        file_content = f.read()
    
    filename = os.path.basename(file_path)
    
    data.append(f'--{boundary}\r\n'.encode('utf-8'))
    data.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode('utf-8'))
    data.append(f'Content-Type: {file_type}\r\n\r\n'.encode('utf-8'))
    data.append(file_content)
    data.append(f'\r\n--{boundary}--\r\n'.encode('utf-8'))
    
    body = b''.join(data)
    req = urllib.request.Request(url, data=body, headers=headers, method='POST')
    
    try:
        resp = urllib.request.urlopen(req)
        return resp.getcode(), resp.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')

# Test 1: Upload a sample PDF
print("\n--- Test 1: Upload PDF ---")
status, text = post_multipart("http://127.0.0.1:8000/upload/pdf", "test.pdf")
print(status, text)
judgment_id = None
if status == 200:
    data = json.loads(text)
    judgment_id = data.get("judgment_id")

# Test 2: Check status
if judgment_id:
    print("\n--- Test 2: Check Status ---")
    try:
        req = urllib.request.Request(f"http://127.0.0.1:8000/upload/status/{judgment_id}")
        resp = urllib.request.urlopen(req)
        print(resp.getcode(), resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(e.code, e.read().decode('utf-8'))

# Test 3: List judgments
print("\n--- Test 3: List judgments ---")
try:
    req = urllib.request.Request("http://127.0.0.1:8000/upload/list")
    resp = urllib.request.urlopen(req)
    print(resp.getcode(), resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(e.code, e.read().decode('utf-8'))

# Test 4: Upload non-PDF file
print("\n--- Test 4: Upload non-PDF file ---")
with open("test.txt", "w") as f:
    f.write("This is a text file.")
status, text = post_multipart("http://127.0.0.1:8000/upload/pdf", "test.txt", file_type="text/plain")
print(status, text)

print("\nTests complete.")
