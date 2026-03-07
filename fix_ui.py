import os
import re
from patch_ui import templates_db, js_addition_template, files

for filename in files:
    path = f"/Users/rahulgupta/Frontent_aiexpert/{filename}"
    with open(path, "r") as f:
        content = f.read()

    js_to_remove = js_addition_template.format(templates_js=templates_db[filename])
    
    # Remove all incorrect injections
    content = content.replace(js_to_remove, '')
    
    # Remove original generateCert function if it still exists
    content = re.sub(r'function generateCert\(e\) \{[\s\S]*?alert\([\s\S]*?\}\n', '', content)
    content = re.sub(r'function generateCert\(e\) \{[\s\S]*?alert\([\s\S]*?\}', '', content)
    
    # Re-inject the new JS exactly once before </body>
    if js_to_remove not in content:
        content = content.replace('</body>', '<script>\n' + js_to_remove + '\n</script>\n</body>')
    
    with open(path, "w") as f:
        f.write(content)
        
    print("Fixed", filename)
