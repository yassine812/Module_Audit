import os
import sys
import django

def check_db(settings_module, path):
    sys.path.insert(0, path)
    os.environ["DJANGO_SETTINGS_MODULE"] = settings_module
    django.setup()
    
    from Organisation.models import Section
    from audit.models import ResultatAudit
    
    print(f"\n--- Checking {settings_module} in {path} ---")
    print("Total Sections:", Section.objects.count())
    print("Total ResultatAudit:", ResultatAudit.objects.count())
    
    for section in Section.objects.all():
        print(f"- Section: ID={section.id}, Name={repr(section.name)}")
        
    for r in ResultatAudit.objects.all()[:5]:
        section_name = r.audit.section.name if r.audit and r.audit.section else "No Section"
        print(f"- ResultatAudit: ID={r.id}, Sujet={repr(r.sujet)}, Section={repr(section_name)}")

# Let's run a separate process or clean imports for the check
if __name__ == "__main__":
    import subprocess
    # Run check for root Module_Audit
    print("Checking root db...")
    # We can just check the sqlite files directly to see their sizes and tables!
    import sqlite3
    db_paths = [
        r"c:\Users\Yassine\Module_Audit-main-main\db.sqlite3",
        r"c:\Users\Yassine\Module_Audit-main-main\Module_Audit\db.sqlite3",
        r"c:\Users\Yassine\Module_Audit-main-main\Module_Audit\Module_Audit\db.sqlite3",
    ]
    for db in db_paths:
        if os.path.exists(db):
            print(f"\nDatabase: {db} (Size: {os.path.getsize(db)} bytes)")
            conn = sqlite3.connect(db)
            cursor = conn.cursor()
            try:
                cursor.execute("SELECT COUNT(*) FROM Organisation_section")
                sections = cursor.fetchone()[0]
                cursor.execute("SELECT COUNT(*) FROM audit_resultataudit")
                results = cursor.fetchone()[0]
                print(f"  Sections count: {sections}")
                print(f"  ResultatAudit count: {results}")
                if sections > 0:
                    cursor.execute("SELECT id, name FROM Organisation_section")
                    print("  Sections:")
                    for row in cursor.fetchall():
                        print(f"    - {row[0]}: {row[1]}")
            except sqlite3.OperationalError as e:
                print(f"  Error: {e}")
            conn.close()
