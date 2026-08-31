import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Fix updatePelangganData - idxIkr
    content = re.sub(
        r'const idxAktivasi = getColIdx\(\[\'aktivasi\'\]\);(?![\s\S]*const idxIkr = getColIdx\(\[\'ikr\'\]\);)',
        r'const idxAktivasi = getColIdx([\'aktivasi\']);\n    const idxIkr = getColIdx([\'ikr\']);',
        content, count=1
    )

    # 2. Fix updatePelangganData - setValue
    content = re.sub(
        r'(if \(idxLng !== -1\) dbSheet\.getRange\(targetRow, idxLng \+ 1\)\.setValue\(payload\.longitude \? \"\'\" \+ payload\.longitude : \"\"\);\n)',
        r'\g<1>    if (idxAktivasi !== -1 && payload.aktivasi !== undefined) dbSheet.getRange(targetRow, idxAktivasi + 1).setValue(payload.aktivasi);\n    if (idxIkr !== -1 && payload.ikr !== undefined) dbSheet.getRange(targetRow, idxIkr + 1).setValue(payload.ikr);\n',
        content, count=1
    )

    # 3. Fix updatePelangganData - Supabase payload
    content = re.sub(
        r'(\"aktivasi\": payload\.aktivasi \|\| \"Belum\")\n',
        r'\g<1>,\n        "ikr": payload.ikr || "Belum"\n',
        content, count=1
    )

    # 4. Fix updateMassalPelanggan - idxIkr
    content = re.sub(
        r'(const idxAktivasi = getColIdx\(\[\'aktivasi\'\]\);)\n\s*// Jika kolom ID Pelanggan atau Kolom Aktivasi tidak ditemukan',
        r'\g<1>\n      const idxIkr = getColIdx([\'ikr\']);\n\n      // Jika kolom ID Pelanggan atau Kolom Aktivasi tidak ditemukan',
        content, count=1
    )

    # 5. Fix updateMassalPelanggan - setValue
    content = re.sub(
        r'(if \(targetRow !== -1\) \{\n\s*dbSheet\.getRange\(targetRow, idxAktivasi \+ 1\)\.setValue\(payload\.aktivasi\);\n\s*\})',
        r'if (targetRow !== -1) {\n          dbSheet.getRange(targetRow, idxAktivasi + 1).setValue(payload.aktivasi);\n          if (idxIkr !== -1 && payload.ikr !== undefined) {\n            dbSheet.getRange(targetRow, idxIkr + 1).setValue(payload.ikr);\n          }\n        }',
        content, count=1
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print('Fixed ' + filepath)

fix_file('code website ops tracker')
fix_file('Code.gs')
