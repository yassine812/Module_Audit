import os

directory = r"c:\Users\Yassine\Module_Audit-main-main"

js_to_add = """
  // Preserve URL parameters in pagination links
  document.addEventListener("DOMContentLoaded", function() {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.toString()) {
          document.querySelectorAll('.pagination a.page-link').forEach(function(link) {
              const href = link.getAttribute('href');
              if (href && href.startsWith('?page=')) {
                  const pageNum = href.split('=')[1];
                  const newParams = new URLSearchParams(window.location.search);
                  newParams.set('page', pageNum);
                  link.setAttribute('href', '?' + newParams.toString());
              }
          });
      }
  });
"""

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        
        if 'Preserve URL parameters in pagination links' not in content:
            if '{% block extra_js %}' in content:
                content = content.replace('{% block extra_js %}', '{% block extra_js %}\n<script>' + js_to_add + '</script>')
            elif '</script>' in content:
                content = content.replace('</script>', js_to_add + '\n</script>')
            
            if content != original_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Updated {filepath}")
    except Exception as e:
        pass

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith("_list.html"):
            process_file(os.path.join(root, file))
