import os
import re

directory = r"c:\Users\Yassine\Module_Audit-main-main"

replacement_html = r'''<div class="pagination-container">
            <div class="pagination-info px-2">
              <span class="fw-bold text-dark">{{ page_obj.number }}</span> / {{ paginator.num_pages }} &bull; {{ paginator.count }} éléments
            </div>'''

# We will just match the wrapper div and the text inside it, ignoring the inner div's class
pattern_html = re.compile(
    r'<div class="d-flex justify-content-between align-items-center">\s*<div[^>]*>\s*Page[^<]*<span[^>]*>{{ page_obj\.number }}</span>[^s]*sur\s*{{ paginator\.num_pages }}\s*\([^)]*\)\s*</div>', re.DOTALL | re.IGNORECASE
)

pattern_html2 = re.compile(
    r'<div class="d-flex justify-content-between align-items-center">\s*<div[^>]*>\s*Page\s*{{ page_obj\.number }}\s*sur\s*{{ paginator\.num_pages }}\s*\([^)]*\)\s*</div>', re.DOTALL | re.IGNORECASE
)

css_to_add = """
  /* Responsive Pagination */
  .pagination-container {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
  }
  .pagination-info {
      white-space: nowrap;
      color: #64748b;
      font-weight: 500;
  }
  @media (max-width: 576px) {
      .pagination-container {
          flex-direction: column;
          justify-content: center;
      }
      .pagination-info {
          font-size: 0.9rem;
          margin-bottom: 4px;
      }
  }
"""

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        
        # Replace the bad pagination block
        content = pattern_html.sub(replacement_html, content)
        content = pattern_html2.sub(replacement_html, content)
        
        if content != original_content:
            # Add CSS
            if '</style>' in content and '/* Responsive Pagination */' not in content:
                content = content.replace('</style>', css_to_add + '</style>')
            elif '</style>' not in content and '{% block content %}' in content:
                style_block = f"<style>{css_to_add}</style>\n" + "{% block content %}"
                content = content.replace('{% block content %}', style_block)
                
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {filepath}")
    except Exception as e:
        pass

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith("_list.html"):
            process_file(os.path.join(root, file))
