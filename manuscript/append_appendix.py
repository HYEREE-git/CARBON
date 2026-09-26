"""Append the original manuscript's Supplementary Appendix (minus A2, A4, A12)
to the rebuilt manuscript produced by build_paper.js.

Usage: python3 append_appendix.py <original.docx> <rebuilt.docx>
The rebuilt file is rewritten in place. The appendix is inserted before the
"저자 확인 사항" heading.
"""
import copy
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

from lxml import etree

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
PR = 'http://schemas.openxmlformats.org/package/2006/relationships'
DROP_NS = re.compile(r'^\{http://schemas\.microsoft\.com/office/word/(2010|2012|2015|2016|2018|2020|2023|2024|2026)/')
DROP_SECTIONS = {'A2', 'A4', 'A12'}
NEW_TEXT_WIDTH = 9026          # twips, A4 with 1-inch margins
EMU_PER_TWIP = 635


def text(e):
    return ''.join(e.itertext()).strip()


def main(old_path, new_path):
    tmp = Path(tempfile.mkdtemp())
    old, new = tmp / 'old', tmp / 'new'
    zipfile.ZipFile(old_path).extractall(old)
    zipfile.ZipFile(new_path).extractall(new)

    old_doc = etree.parse(str(old / 'word/document.xml'))
    new_doc = etree.parse(str(new / 'word/document.xml'))
    old_body = old_doc.getroot().find(f'{{{W}}}body')
    new_body = new_doc.getroot().find(f'{{{W}}}body')

    kids = list(old_body)
    start = next(i for i, e in enumerate(kids) if text(e) == 'Supplementary Appendix')
    frag, skipping = [], False
    for e in kids[start:]:
        if e.tag == f'{{{W}}}sectPr':
            continue
        m = re.match(r'^(A\d+)\.\s', text(e)) if e.tag == f'{{{W}}}p' else None
        if m:
            skipping = m.group(1) in DROP_SECTIONS
        if not skipping:
            frag.append(copy.deepcopy(e))

    # Relationships: copy images under fresh ids.
    old_rels = etree.parse(str(old / 'word/_rels/document.xml.rels'))
    new_rels = etree.parse(str(new / 'word/_rels/document.xml.rels'))
    old_by_id = {r.get('Id'): r for r in old_rels.getroot()}
    id_map, n = {}, 0
    for e in frag:
        for el in e.iter():
            for attr in (f'{{{R}}}embed', f'{{{R}}}id', f'{{{R}}}link'):
                rid = el.get(attr)
                if rid is None:
                    continue
                if rid not in id_map:
                    rel = old_by_id[rid]
                    n += 1
                    target = rel.get('Target')
                    new_target = f'media/apx_{Path(target).name}'
                    shutil.copy(old / 'word' / target, new / 'word' / new_target)
                    new_id = f'rIdApx{n}'
                    etree.SubElement(new_rels.getroot(), f'{{{PR}}}Relationship',
                                     Id=new_id, Type=rel.get('Type'), Target=new_target)
                    id_map[rid] = new_id
                el.set(attr, id_map[rid])

    # Strip Word-version-specific attributes/elements, renumber drawing ids,
    # and shrink anything wider than the new text column.
    doc_pr_id = 1000
    for e in frag:
        for el in list(e.iter()):
            if not isinstance(el.tag, str):
                continue
            if DROP_NS.match(el.tag):
                el.getparent().remove(el)
                continue
            for k in list(el.attrib):
                if DROP_NS.match(k):
                    del el.attrib[k]
            if el.tag == f'{{{WP}}}docPr':
                doc_pr_id += 1
                el.set('id', str(doc_pr_id))
        for ext in e.iter(f'{{{WP}}}extent'):
            cx, cy = int(ext.get('cx')), int(ext.get('cy'))
            max_cx = NEW_TEXT_WIDTH * EMU_PER_TWIP
            if cx > max_cx:
                f = max_cx / cx
                ext.set('cx', str(max_cx))
                ext.set('cy', str(int(cy * f)))
                for a_ext in ext.getparent().iter(f'{{{A}}}ext'):
                    a_ext.set('cx', str(max_cx))
                    a_ext.set('cy', str(int(cy * f)))
        for tbl in e.iter(f'{{{W}}}tbl'):
            grid = [int(g.get(f'{{{W}}}w')) for g in tbl.iter(f'{{{W}}}gridCol')]
            if sum(grid) > NEW_TEXT_WIDTH:
                f = NEW_TEXT_WIDTH / sum(grid)
                for tag in ('gridCol', 'tcW', 'tblW'):
                    for el in tbl.iter(f'{{{W}}}{tag}'):
                        v = el.get(f'{{{W}}}w')
                        if v and el.get(f'{{{W}}}type', 'dxa') == 'dxa':
                            el.set(f'{{{W}}}w', str(int(int(v) * f)))

    # Insert before the author-check heading, starting on a new page.
    anchor = next(e for e in new_body if text(e) == '저자 확인 사항')
    br = etree.Element(f'{{{W}}}p')
    etree.SubElement(etree.SubElement(br, f'{{{W}}}r'), f'{{{W}}}br', {f'{{{W}}}type': 'page'})
    idx = list(new_body).index(anchor)
    for k, e in enumerate([br] + frag):
        new_body.insert(idx + k, e)
    br2 = copy.deepcopy(br)
    new_body.insert(idx + len(frag) + 1, br2)

    new_doc.write(str(new / 'word/document.xml'), xml_declaration=True, encoding='UTF-8', standalone=True)
    new_rels.write(str(new / 'word/_rels/document.xml.rels'), xml_declaration=True, encoding='UTF-8', standalone=True)

    out = Path(new_path)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        ct = new / '[Content_Types].xml'
        z.write(ct, '[Content_Types].xml')
        for p in sorted(new.rglob('*')):
            if p.is_file() and p != ct:
                z.write(p, p.relative_to(new).as_posix())
    print(f'appended {len(frag)} blocks, {n} images -> {out}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
