"""
Reads the client's catalogue workbook (PRODUCT LIST_02.xlsx) into one JSON
file of products plus the pictures that belong to them.

The workbook is laid out like a printed catalogue, with a different layout per
sheet, so each sheet has an explicit reader. Output:
  OUT/catalogue.json   products, categories, warnings
  OUT/images/<file>    every picture that was matched to a product
"""
import json, os, re, sys, zipfile, xml.etree.ElementTree as ET
from collections import defaultdict

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(f'{OUT}/images', exist_ok=True)
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
      'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
RID = '{%s}id' % NS['r']; EMBED = '{%s}embed' % NS['r']
z = zipfile.ZipFile(SRC)
ss = [''.join(t.text or '' for t in si.iter('{%s}t' % NS['m']))
      for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS)]
wb = ET.fromstring(z.read('xl/workbook.xml'))
wbrels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}

def col_index(letters):
    n = 0
    for ch in letters: n = n * 26 + ord(ch) - 64
    return n - 1

def load_sheet(i):
    s = list(wb.find('m:sheets', NS))[i]
    path = 'xl/' + wbrels[s.get(RID)].replace('/xl/', '').lstrip('/')
    cells = {}
    for c in ET.fromstring(z.read(path)).iter('{%s}c' % NS['m']):
        v = c.find('m:v', NS); t = c.get('t'); val = None
        if t == 's' and v is not None: val = ss[int(v.text)]
        elif v is not None: val = v.text
        if val is None or not val.strip(): continue
        m = re.match(r'([A-Z]+)(\d+)', c.get('r'))
        cells[(int(m.group(2)), col_index(m.group(1)))] = val
    pics = []  # (row 1-based, col 0-based, zip path)
    relp = path.replace('worksheets/', 'worksheets/_rels/') + '.rels'
    if relp in z.namelist():
        for r in ET.fromstring(z.read(relp)):
            if not r.get('Type').endswith('/drawing'): continue
            dpath = 'xl/' + r.get('Target').replace('../', '')
            drels = {x.get('Id'): 'xl/' + x.get('Target').replace('../', '')
                     for x in ET.fromstring(z.read(dpath.replace('drawings/', 'drawings/_rels/') + '.rels'))}
            for anc in ET.fromstring(z.read(dpath)):
                fr = anc.find('xdr:from', NS); blip = anc.find('.//a:blip', NS)
                if fr is None or blip is None: continue
                pics.append((int(fr.find('xdr:row', NS).text) + 1, int(fr.find('xdr:col', NS).text), drels[blip.get(EMBED)]))
    return s.get('name'), cells, pics

def norm(v): return re.sub(r'\s+', ' ', v).strip().upper()
def clean(s): return re.sub(r'[ \t ]+', ' ', s.replace('～', '~')).strip(' ,')
def lines(s): return [clean(x) for x in s.split('\n') if clean(x)]

products, warnings = [], []
used_pics = set()

def add(sheet, category, brand, model, name, specs, features, pic_paths, source):
    products.append({'sheet': sheet, 'category': category, 'brand': brand, 'model': clean(model),
                     'name': clean(name), 'specs': specs, 'features': features,
                     'images': pic_paths, 'source': source})
    for p in pic_paths: used_pics.add(p)

def split_label(line):
    m = re.match(r'^([^:：]{2,40}?)\s*[:：]\s*(.*)$', line)
    return (clean(m.group(1)).title(), clean(m.group(2))) if m and m.group(2).strip() else (None, line)

GUESS = [
    (r'(l\s*/\s*min|lpm|l/s\b|m3\s*/\s*h|m3\s*/\s*min|cfm|cbm)', 'Flow'),
    (r'(\bbar\b|\d\s*bar|psi|mpa|kpa)', 'Pressure'),
    (r'\d\s*(k?w|hp|kva)\b', 'Power'),
    (r'(\bamp|\d\s*a\b)', 'Current'),
    (r'(\d\s*v\b|\d\s*v\s*/|hz\b|phase)', 'Voltage'),
    (r'(rpm|r\s*/\s*min|r/pm|bpm|ipm|/min\b)', 'Speed'),
    (r'n\.?\s*m\b', 'Torque'),
    (r'(\bcc\b|\dcc|stroke)', 'Engine'),
    (r'(igbt|mosfet|inverter|transformer|induction|universal|brushless|diaphra|piston|plunger|screw)', 'Technology'),
    (r'\d\s*(l|ltr|litre)\b', 'Capacity'),
    (r'(\d\s*mm|\d\s*"|\d\s*inch|\d\s*mtr)', 'Size'),
]
def guess_label(value):
    v = value.lower()
    for pattern, label in GUESS:
        if re.search(pattern, v): return label
    return 'Features'

def model_and_desc(text, code_re):
    """'GPG80JS - ELECTRIC JIG SAW' -> ('GPG80JS', 'Electric Jig Saw'); '5246 CIRCULAR SAW' -> ('5246', 'Circular Saw')."""
    text = clean(text)
    m = re.match(code_re, text)
    if not m: return text, None
    code = clean(m.group(0)).rstrip(' -')
    rest = clean(text[m.end():]).lstrip('-– ').strip()
    return code, (rest.title() if rest else None)

# ---------------------------------------------------------------- stacked cards (sheets 1 and 3)
def read_cards(idx, brand, header_map, code_re, type_names):
    sheet, cells, pics = load_sheet(idx)
    for text_col, head_col, pic_col in ((2, 0, 1), (6, 4, 5)):
        rows = sorted(r for (r, c) in cells if c == text_col and r > 10)
        # category headers for this column pair
        heads = sorted((r, header_map.get(norm(v)), clean(v))
                       for (r, c), v in cells.items() if c == head_col and r > 10 and not clean(v).isdigit())
        def category_at(row):
            cat = None
            for r, mapped, raw in heads:
                if r <= row and mapped: cat = mapped
            return cat
        model_rows = [r for r in rows if re.match(code_re, clean(cells[(r, text_col)]))]
        # A short ALL-CAPS line with no digits or colon ("PAINT MIXER") names the models under it.
        is_sub = lambda x: (lambda t: t.isupper() and ':' not in t and not re.search(r'\d', t) and len(t) < 30)(clean(cells[(x, text_col)]))
        subs = {x: clean(cells[(x, text_col)]).replace('\n', ' ').title() for x in rows if x not in model_rows and is_sub(x)}
        labels = []
        for i, r in enumerate(model_rows):
            end = model_rows[i + 1] if i + 1 < len(model_rows) else 10**6
            # a category header in the other column never ends a card; one in this pair does
            hdr_rows = [h for h, m, _ in heads if h > r and m]
            if hdr_rows: end = min(end, hdr_rows[0])
            body_rows, prev = [], r
            for x in rows:
                if not (r < x < end) or x in subs: continue
                if x - prev > 3: break
                body_rows.append(x); prev = x
            body = [clean(cells[(x, text_col)]) for x in body_rows]
            sub = next((subs[x] for x in sorted(subs, reverse=True) if x < r and category_at(x) == category_at(r) and not any(x < m < r and model_and_desc(cells[(m, text_col)], code_re)[1] for m in model_rows)), None)
            if category_at(r) != category_at(model_rows[i - 1]) if i else True: labels = []
            specs = []
            new_labels = []
            for j, line in enumerate(body):
                lab, val = split_label(line)
                if lab: new_labels.append(lab)
                elif j < len(labels): lab = labels[j]
                specs.append({'label': lab, 'value': val})
            if new_labels and len(new_labels) >= len(body) - 1: labels = [s['label'] for s in specs]
            elif not new_labels and len(labels) != len(body):
                # Different shape from the labelled card above: don't borrow its labels.
                for s_ in specs: s_['label'] = guess_label(s_['value'])
            for s_ in specs: s_['label'] = s_['label'] or guess_label(s_['value'])
            code, desc = model_and_desc(cells[(r, text_col)], code_re)
            cat = category_at(r)
            if not cat:
                warnings.append(f'{sheet}: no category for {code} (row {r})'); continue
            near = [p for p in pics if p[1] == pic_col and abs(p[0] - r) <= 2]
            near.sort(key=lambda p: abs(p[0] - r))
            name = f'{desc or sub or type_names[cat]} - {code}'
            add(sheet, cat, brand, code, name, specs, [], [near[0][2]] if near else [], f'{sheet}!{chr(65 + text_col)}{r}')
            if not near: warnings.append(f'{sheet}: no picture found for {code}')

# ---------------------------------------------------------------- model grid (sheet 2, HCC)
def read_grid(idx, brand, header_map, type_names):
    sheet, cells, pics = load_sheet(idx)
    grid_cols = [2, 3, 4, 5, 7]
    row_has = lambda r: any((r, c) in cells for c in grid_cols)
    cat, labels, last_model_row = None, [], {}
    maxr = max(r for r, _ in cells)
    for r in range(11, maxr + 1):
        if (r, 1) in cells and (r, 0) in cells and clean(cells[(r, 0)]).isdigit():
            cat = header_map.get(norm(cells[(r, 1)]), cat); continue
        if (r, 1) in cells and norm(cells[(r, 1)]).startswith('OTHER'):
            cat = header_map['OTHER SERIES']
        if not row_has(r) or row_has(r - 1) or (r, 1) in cells: continue
        # r is a model row: the values follow on consecutive rows (after at most one blank row)
        vr = r + 1; body_rows = []
        if not row_has(vr) and row_has(vr + 1): vr += 1
        while row_has(vr): body_rows.append(vr); vr += 1
        row_labels = [clean(cells[(x, 1)]) if (x, 1) in cells else None for x in body_rows]
        if any(row_labels): labels = [l or (labels[i] if i < len(labels) else None) for i, l in enumerate(row_labels)]
        for c in grid_cols:
            if (r, c) not in cells: continue
            code, desc = model_and_desc(cells[(r, c)], r'^[A-Z]{0,3}\d{3,4}[A-Z]{0,3}(\s*/\s*\d{3,4})?')
            specs = [{'label': (labels[i] if i < len(labels) else None) or guess_label(clean(cells[(x, c)])), 'value': clean(cells[(x, c)])}
                     for i, x in enumerate(body_rows) if (x, c) in cells]
            lo = last_model_row.get(c, 10)
            mine = sorted([p for p in pics if p[1] == c and lo < p[0] <= r], key=lambda p: p[0])
            last_model_row[c] = r
            sku_code = f'HCC {code}'
            add(sheet, cat, brand, sku_code, f'{desc or type_names[cat]} - {sku_code}', specs, [],
                [p[2] for p in mine[:1]], f'{sheet}!{chr(65 + c)}{r}')
            if not mine: warnings.append(f'{sheet}: no picture found for {sku_code}')

# ---------------------------------------------------------------- one product per cell
def read_cells(idx, brand_for, header_map, type_names, legend=None, header_cols=(4, 5, 6), prefix_headers=None):
    sheet, cells, pics = load_sheet(idx)
    heads = sorted((r, header_map[norm(v)]) for (r, c), v in cells.items()
                   if c in header_cols and norm(v) in header_map)
    last_row = defaultdict(int)
    for (r, c) in sorted(cells):
        v = cells[(r, c)]
        if c > 4 or '\n' not in v or r < 3: continue
        ls = lines(v)
        hit = next((cat_ for key, cat_ in (prefix_headers or {}).items() if norm(ls[0] if ls else '').startswith(key)), None)
        if hit:
            heads.append((r, hit)); heads.sort(); continue
        if len(ls) < 2 or len(ls[0]) > 60: continue
        cat = None
        for hr, mapped in heads:
            if hr < r: cat = mapped
        if not cat:
            warnings.append(f'{sheet}: no category for {ls[0]} (row {r})'); continue
        mine = sorted([p for p in pics if p[1] == c and last_row[c] < p[0] <= r], key=lambda p: -p[0])
        last_row[c] = r
        first = ls[0]
        if type_names.get('__names_in_cell__'):
            name, code = first.title(), None
        else:
            code = first
            name = f"{type_names[cat]} - {code}"
        specs = []
        for line in ls[1:]:
            lab, val = split_label(line)
            specs.append({'label': lab or guess_label(val), 'value': val})
        add(sheet, cat, brand_for(first), code or first, name, specs, ls[1:], [p[2] for p in mine[:1]],
            f'{sheet}!{chr(65 + c)}{r}')
        if not mine: warnings.append(f'{sheet}: no picture found for {first}')

# ---------------------------------------------------------------- compressor spec tables (7.1)
def read_tables(idx, brand_for, header_map, type_name):
    sheet, cells, pics = load_sheet(idx)
    maxr = max(r for r, _ in cells)
    r = 1
    while r <= maxr:
        if cells.get((r, 1), '').strip().upper() == 'MODEL':
            cat = header_map[norm(cells[(r, 12)])]
            head, unit = {}, {}
            for c in range(2, 12):
                h = clean(cells.get((r, c), '')) or head.get(c - 1, '')
                head[c] = h.title() if h else ''
                unit[c] = clean(cells.get((r + 1, c), ''))
            sect_pic = sorted([p for p in pics if p[1] == 0 and r - 3 <= p[0] <= r + 40], key=lambda p: abs(p[0] - r))
            x = r + 2
            while (x, 1) in cells and cells[(x, 1)].strip().upper() != 'MODEL':
                code = clean(cells[(x, 1)])
                specs = []
                for c in range(2, 12):
                    val = cells.get((x, c))
                    if val is None or not head[c]: continue
                    try:
                        f = float(val); val = str(round(f, 2)).rstrip('0').rstrip('.') if '.' in str(round(f, 2)) else str(int(f))
                    except ValueError: val = clean(val)
                    u = unit[c] if unit[c] and unit[c] not in ('220V / 415V',) else ''
                    label = head[c] if head[c].upper() not in ('POWER', 'PRESSURE', 'CAPACITY') else f"{head[c]} ({u})"
                    specs.append({'label': label, 'value': f'{val} {u}'.strip() if u and head[c].upper() not in ('POWER', 'PRESSURE', 'CAPACITY') else val})
                add(sheet, cat, brand_for(code), code, f'{type_name[cat]} - {code}', specs, [],
                    [sect_pic[0][2]] if sect_pic else [], f'{sheet}!B{x}')
                x += 1
            r = x
        else:
            r += 1

# ---------------------------------------------------------------- screw compressors (7.2)
def read_screw(idx, brand, cat, type_name):
    sheet, cells, pics = load_sheet(idx)
    for (r, c), v in sorted(cells.items()):
        if c not in (0, 2) or '\n' in v or r in (1, 5) or (r + 1, c) not in cells: continue
        body = lines(cells[(r + 1, c)]) + lines(cells.get((r + 1, c + 1), ''))
        specs = [dict(zip(('label', 'value'), split_label(l))) for l in body]
        specs = [s for s in specs if s['value']]
        mine = [p for p in pics if p[1] == c and r - 2 <= p[0] <= r]
        add(sheet, cat, brand, clean(v), f'{type_name} - {clean(v)}', specs, [], [p[2] for p in mine[:1]], f'{sheet}!{chr(65 + c)}{r}')

# ---------------------------------------------------------------- per-sheet configuration
PT = 'Power Tools'
S1_HEAD = {'ELECTRIC DRILL': 'Electric Drills', 'ROTARY HAMMER': 'Rotary Hammers', 'DEMOLITION HAMMER': 'Demolition Hammers',
           'ANGLE GRINDER': 'Angle Grinders', 'MARBLE CUTTER': 'Marble Cutters', 'SANDER & POLISHER': 'Sanders & Polishers',
           'WOOD WORK': 'Wood Working Tools', 'OTHER SERIES': 'Other Power Tools'}
S1_TYPE = {'Electric Drills': 'Electric Drill', 'Rotary Hammers': 'Rotary Hammer', 'Demolition Hammers': 'Demolition Hammer',
           'Angle Grinders': 'Angle Grinder', 'Marble Cutters': 'Marble Cutter', 'Sanders & Polishers': 'Sander & Polisher',
           'Wood Working Tools': 'Wood Working Tool', 'Other Power Tools': 'Power Tool'}
S3_HEAD = {'1. LITHIUM CORDLESS DRILL': 'Cordless Drills', '1. LITHIUM BRUSHLESS IMPACT DRILL': 'Cordless Drills',
           '2. LITHIUM BRUSHLESS ROTARY HAMMER': 'Cordless Rotary Hammers', '3. LITHIUM BRUSHLESS RACHET WRENCH': 'Cordless Impact Wrenches',
           '3. LITHIUM BRUSHLESS IMPACT WRENCH': 'Cordless Impact Wrenches', '4. LITHIUM BRUSHLESS CUTTING TOOLS': 'Cordless Cutting Tools',
           '5. LITHIUM BRUSHLESS GARDEN TOOLS': 'Cordless Garden Tools', '5. LITHIUM BRUSHLESS AGRICULTURAL TOOLS': 'Cordless Garden Tools',
           '6. OTHER TOOLS': 'Other Cordless Tools'}
S3_TYPE = {'Cordless Drills': 'Cordless Drill', 'Cordless Rotary Hammers': 'Cordless Rotary Hammer',
           'Cordless Impact Wrenches': 'Cordless Impact Wrench', 'Cordless Cutting Tools': 'Cordless Cutting Tool',
           'Cordless Garden Tools': 'Cordless Garden Tool', 'Other Cordless Tools': 'Cordless Tool'}

GP_CODE = r'^\s*(GPG|GP|BPG)[-A-Z0-9]*[A-Z0-9](\s*(/{1,2})\s*(GPG|GP)[-A-Z0-9]+)*'
read_cards(0, 'Global Power', {k.replace('\n', ' '): v for k, v in S1_HEAD.items()} | {'SANDER & POLISHER': 'Sanders & Polishers'}, GP_CODE, S1_TYPE)
read_grid(1, 'HCC', S1_HEAD, S1_TYPE)
read_cards(2, 'Global Power', S3_HEAD, GP_CODE, S3_TYPE)

default_brand = lambda first: 'HCC' if first.upper().startswith('HCC') else 'Global Power'
read_cells(3, default_brand, {'DOMESTIC': 'Domestic Pressure Washers', 'SEMI-COMMERCIAL': 'Semi-Commercial Pressure Washers',
                              'HEAVY DUTY & ULTRA': 'Heavy Duty Pressure Washers', 'PROFESSIONAL MAKE IN INDIA': 'Make in India Pressure Washers'},
           {'Domestic Pressure Washers': 'Pressure Washer', 'Semi-Commercial Pressure Washers': 'Pressure Washer',
            'Heavy Duty Pressure Washers': 'Heavy Duty Pressure Washer', 'Make in India Pressure Washers': 'Pressure Washer'},
           prefix_headers={'MAKE IN INDIA': 'Make in India Pressure Washers'})
read_cells(4, default_brand, {'MMA (MANUAL METAL ARC)': 'MMA Welding Machines', 'MIG (METAL INERT GAS)': 'MIG Welding Machines',
                              'TIG (TUNGSTEN INERT GAS WELDING)': 'TIG Welding Machines', 'INVERTER PLASMA CUTTING': 'Plasma Cutters'},
           {'MMA Welding Machines': 'MMA Welding Machine', 'MIG Welding Machines': 'MIG Welding Machine',
            'TIG Welding Machines': 'TIG Welding Machine', 'Plasma Cutters': 'Plasma Cutter'})
read_cells(5, default_brand, {'DOMESTIC': 'Domestic Vacuum Cleaners', 'HEAVY DUTY': 'Heavy Duty Vacuum Cleaners',
                              'FOAMING': 'Foaming Machines', 'CLEANING EQUIPMENTS': 'Cleaning Equipment'},
           {'Domestic Vacuum Cleaners': 'Vacuum Cleaner', 'Heavy Duty Vacuum Cleaners': 'Vacuum Cleaner',
            'Foaming Machines': 'Foam Machine', 'Cleaning Equipment': 'Cleaning Equipment'})
read_tables(6, default_brand, {'DIRECT DRIVE COMPRESSORS': 'Direct Drive Compressors', 'OIL FREE COMPRESSORS': 'Oil Free Compressors',
                               'BELT DRIVE COMPRESSORS': 'Belt Drive Compressors', 'ENGINE DRIVE COMPRESSORS': 'Engine Drive Compressors'},
            {'Direct Drive Compressors': 'Air Compressor', 'Oil Free Compressors': 'Oil Free Air Compressor',
             'Belt Drive Compressors': 'Belt Drive Air Compressor', 'Engine Drive Compressors': 'Engine Drive Air Compressor'})
read_screw(7, 'Global Power', 'Screw Drive Compressors', 'Screw Air Compressor')
read_cells(8, default_brand, {'DIAPHRAGM SPRAYERS': 'Diaphragm Sprayers', 'PISTON PUMP': 'Piston Pump Sprayers',
                              'ENGINE DRIVE': 'Engine Drive Sprayers', 'SCREW PUMP': 'Screw Pump Sprayers'},
           {'Diaphragm Sprayers': 'Airless Sprayer', 'Piston Pump Sprayers': 'Airless Sprayer',
            'Engine Drive Sprayers': 'Airless Sprayer', 'Screw Pump Sprayers': 'Screw Pump Sprayer'})
read_cells(9, default_brand, {'BRUDH CUTTER': 'Brush Cutters', 'CHAIN SAW': 'Chain Saws', 'ENGINE': 'Engines',
                              'SPRAYER PUMP': 'Engine Sprayers', 'WATER PUMP': 'Water Pumps'},
           {'Brush Cutters': 'Brush Cutter', 'Chain Saws': 'Chain Saw', 'Engines': 'Engine',
            'Engine Sprayers': 'Sprayer Pump', 'Water Pumps': 'Water Pump'}, header_cols=(6,))
read_cells(10, default_brand, {'1. MACHINES & EQUIMENTS': 'Hydraulic Machines & Equipment'},
           {'__names_in_cell__': True}, header_cols=(1,))

# Parent category for each sub-category, and the delivery-rate series name it answers to.
PARENT = {**{v: PT for v in S1_TYPE}, **{v: PT for v in S3_TYPE},
          **dict.fromkeys(['Domestic Pressure Washers', 'Semi-Commercial Pressure Washers', 'Heavy Duty Pressure Washers', 'Make in India Pressure Washers'], 'Pressure Wash'),
          **dict.fromkeys(['MMA Welding Machines', 'MIG Welding Machines', 'TIG Welding Machines', 'Plasma Cutters'], 'Welding Machines'),
          **dict.fromkeys(['Domestic Vacuum Cleaners', 'Heavy Duty Vacuum Cleaners', 'Foaming Machines', 'Cleaning Equipment'], 'Vacuum Cleaner'),
          **dict.fromkeys(['Direct Drive Compressors', 'Oil Free Compressors', 'Belt Drive Compressors', 'Engine Drive Compressors', 'Screw Drive Compressors'], 'Air Compressor'),
          **dict.fromkeys(['Diaphragm Sprayers', 'Piston Pump Sprayers', 'Engine Drive Sprayers', 'Screw Pump Sprayers'], 'Airless Paint Sprayer'),
          **dict.fromkeys(['Brush Cutters', 'Chain Saws', 'Engines', 'Engine Sprayers', 'Water Pumps'], 'Agricultural Products'),
          'Hydraulic Machines & Equipment': 'Hydraulic & Workshop'}

# Extract pictures under stable names: <model-slug>-<n>.<ext>
def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
written = {}
for p in products:
    names = []
    for zp in p['images']:
        ext = zp.rsplit('.', 1)[-1].lower()
        if ext not in ('png', 'jpeg', 'jpg'):
            warnings.append(f"{p['sheet']}: skipped {ext} picture for {p['model']}"); continue
        if zp not in written:
            fname = f"{slug(p['model'])[:60]}-{len(written) + 1}.{ 'jpg' if ext == 'jpeg' else ext}"
            with open(f'{OUT}/images/{fname}', 'wb') as f: f.write(z.read(zp))
            written[zp] = fname
        names.append(written[zp])
    p['images'] = names

# SKUs must be unique: repeat model codes get a numbered suffix and a warning.
seen = defaultdict(int)
for p in products:
    base = re.sub(r'[^A-Z0-9]+', '-', p['model'].upper()).strip('-')[:48]
    seen[base] += 1
    p['sku'] = base if seen[base] == 1 else f'{base}-{seen[base]}'
    if seen[base] > 1: warnings.append(f"{p['sheet']}: model {p['model']} appears more than once; this one is SKU {p['sku']}")

all_pics = sum(len(load_sheet(i)[2]) for i in range(11))
json.dump({'products': products, 'parents': PARENT, 'warnings': warnings,
           'stats': {'pictures_in_file': all_pics, 'pictures_used': len(written)}},
          open(f'{OUT}/catalogue.json', 'w'), indent=1, ensure_ascii=False)
by = defaultdict(int)
for p in products: by[(p['sheet'], p['category'])] += 1
for k, n in sorted(by.items()): print(f'{n:4}  {k[0]:24} {k[1]}')
print('TOTAL products', len(products), '| pictures used', len(written), 'of', all_pics, '| warnings', len(warnings))
