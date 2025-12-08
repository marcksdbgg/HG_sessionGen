#!/usr/bin/env python3
"""
sync-to-main.py - Genera un reporte de archivos a sincronizar con main

Run from anywhere:
    python external-files/scripts/sync-to-main.py              # Compara rama actual vs origin/main
    python external-files/scripts/sync-to-main.py --export     # Exporta los archivos modificados
"""

import subprocess
import os
import sys
import shutil
from datetime import datetime
from pathlib import Path

# Get the project root (2 levels up from this script's location)
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent

# Change working directory to project root
os.chdir(PROJECT_ROOT)

# Configuración
EXCLUDED_PATTERNS = [
    'node_modules/',
    'dist/',
    '.git/',
    '*.lock',
    'package-lock.json',
    'full_codebase.md',
    'external-files/',
    '.env*',
    'SYNC_REPORT.md'
]

def run_git(cmd: list) -> str:
    """Ejecuta un comando git y retorna el output."""
    result = subprocess.run(['git'] + cmd, capture_output=True, text=True, cwd=PROJECT_ROOT)
    return result.stdout.strip()

def get_current_branch() -> str:
    """Obtiene el nombre de la rama actual."""
    return run_git(['branch', '--show-current'])

def get_changed_files(base: str = 'origin/main') -> dict:
    """
    Obtiene los archivos modificados entre la rama actual y la base.
    Retorna un diccionario con categorías: added, modified, deleted, renamed
    """
    # Asegurar que tenemos la última versión de origin/main
    run_git(['fetch', 'origin', 'main'])
    
    # Obtener diff con nombres y estados
    diff_output = run_git(['diff', '--name-status', base])
    
    changes = {
        'added': [],      # A - nuevos archivos
        'modified': [],   # M - modificados
        'deleted': [],    # D - eliminados
        'renamed': []     # R - renombrados
    }
    
    for line in diff_output.split('\n'):
        if not line.strip():
            continue
        
        parts = line.split('\t')
        status = parts[0][0]  # Primera letra del status
        
        # Verificar exclusiones
        file_path = parts[-1]
        if any(pattern.rstrip('/') in file_path or file_path.endswith(pattern.lstrip('*')) 
               for pattern in EXCLUDED_PATTERNS):
            continue
        
        if status == 'A':
            changes['added'].append(file_path)
        elif status == 'M':
            changes['modified'].append(file_path)
        elif status == 'D':
            changes['deleted'].append(file_path)
        elif status == 'R':
            old_path = parts[1]
            new_path = parts[2]
            changes['renamed'].append((old_path, new_path))
    
    return changes

def get_file_diff(file_path: str, base: str = 'origin/main') -> str:
    """Obtiene el diff de un archivo específico."""
    return run_git(['diff', base, '--', file_path])

def export_files(changes: dict, export_dir: str = 'sync-export'):
    """Exporta los archivos modificados a una carpeta."""
    export_path = PROJECT_ROOT / export_dir
    if export_path.exists():
        shutil.rmtree(export_path)
    export_path.mkdir(parents=True)
    
    # Copiar archivos añadidos y modificados
    for file_list in [changes['added'], changes['modified']]:
        for file_path in file_list:
            src = PROJECT_ROOT / file_path
            if src.exists():
                dest = export_path / file_path
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dest)
    
    # Crear archivo de instrucciones
    with open(export_path / 'SYNC_INSTRUCTIONS.md', 'w', encoding='utf-8') as f:
        f.write(generate_report(changes, detailed=False))
    
    return export_path

def generate_report(changes: dict, detailed: bool = False) -> str:
    """Genera el reporte en formato Markdown."""
    current_branch = get_current_branch()
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    total = sum(len(v) for v in changes.values())
    
    report = f"""# 📋 Sync Report: {current_branch} → main

**Generado:** {timestamp}
**Rama origen:** `{current_branch}`
**Rama destino:** `origin/main`
**Total de cambios:** {total} archivos

---

"""
    
    # Archivos añadidos (CREAR en main)
    if changes['added']:
        report += f"## ✅ CREAR ({len(changes['added'])} archivos nuevos)\n\n"
        report += "Estos archivos NO existen en main. Debes crearlos:\n\n"
        for f in sorted(changes['added']):
            report += f"- [ ] `{f}`\n"
        report += "\n"
    
    # Archivos modificados (ACTUALIZAR en main)
    if changes['modified']:
        report += f"## 🔄 ACTUALIZAR ({len(changes['modified'])} archivos modificados)\n\n"
        report += "Estos archivos existen en main pero tienen cambios. Debes reemplazar el contenido:\n\n"
        for f in sorted(changes['modified']):
            report += f"- [ ] `{f}`\n"
        report += "\n"
    
    # Archivos eliminados (BORRAR en main)
    if changes['deleted']:
        report += f"## ❌ ELIMINAR ({len(changes['deleted'])} archivos)\n\n"
        report += "Estos archivos existen en main pero fueron eliminados en tu rama:\n\n"
        for f in sorted(changes['deleted']):
            report += f"- [ ] `{f}`\n"
        report += "\n"
    
    # Archivos renombrados
    if changes['renamed']:
        report += f"## 📝 RENOMBRAR ({len(changes['renamed'])} archivos)\n\n"
        report += "Estos archivos fueron renombrados o movidos:\n\n"
        for old, new in changes['renamed']:
            report += f"- [ ] `{old}` → `{new}`\n"
        report += "\n"
    
    # Sin cambios
    if total == 0:
        report += "## ✨ Sin cambios\n\n"
        report += "Tu rama está sincronizada con `origin/main`. No hay nada que copiar.\n"
    
    # Resumen de acciones
    if total > 0:
        report += """---

## 📌 Pasos a seguir

1. **Abre main en GitHub/editor web**
2. **Para archivos NUEVOS:** Crea el archivo y pega el contenido
3. **Para archivos MODIFICADOS:** Abre el archivo, selecciona todo, pega el nuevo contenido
4. **Para archivos ELIMINADOS:** Elimina el archivo
5. **Haz commit con mensaje descriptivo**

"""
    
    return report

def main():
    args = sys.argv[1:]
    
    print(f"📂 Working from project root: {PROJECT_ROOT}")
    print("🔍 Obteniendo diferencias con origin/main...")
    
    changes = get_changed_files()
    
    if '--export' in args:
        export_path = export_files(changes)
        print(f"\n📁 Archivos exportados a: {export_path.absolute()}")
        print("   Abre SYNC_INSTRUCTIONS.md para ver las instrucciones")
    else:
        report = generate_report(changes, detailed='--detailed' in args)
        print(report)
        
        # Guardar reporte a la misma carpeta que el script
        report_file = SCRIPT_DIR / 'SYNC_REPORT.md'
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"\n💾 Reporte guardado en: {report_file}")

if __name__ == '__main__':
    main()
