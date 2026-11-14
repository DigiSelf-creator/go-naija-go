"""Test only: packs the 13 frames into sprite strips and measures PNG / WebP sizes.
python3 measure.py <frames dir> <out dir>"""
import io
import os
import sys

from PIL import Image

d, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
NAMES = ['run%02d' % i for i in range(10)] + ['jump', 'fall', 'land']


def strip(paths):
    ims = [Image.open(p).convert('RGBA') for p in paths]
    w, h = ims[0].size
    s = Image.new('RGBA', (w * len(ims), h), (0, 0, 0, 0))
    for i, im in enumerate(ims):
        s.paste(im, (i * w, 0))
    return s


def sizes(im):
    r = {}
    for label, kw, fmt, conv in [
        ('png', {'optimize': True}, 'PNG', None),
        ('png8', {'optimize': True}, 'PNG', 'q'),
        ('webp_lossless', {'lossless': True, 'method': 6}, 'WEBP', None),
        ('webp_q80', {'quality': 80, 'method': 6}, 'WEBP', None),
    ]:
        b = io.BytesIO()
        x = im.quantize(256, method=Image.Quantize.FASTOCTREE) if conv else im
        x.save(b, fmt, **kw)
        r[label] = len(b.getvalue())
    return r


def kb(n):
    return '%.1f KB' % (n / 1024)


raw1 = sum(os.path.getsize(os.path.join(d, n + '_1x.png')) for n in NAMES)
raw2 = sum(os.path.getsize(os.path.join(d, n + '_2x.png')) for n in NAMES)
print('13 loose frames straight from Blender: 1x %s, 2x %s' % (kb(raw1), kb(raw2)))
for k in (1, 2):
    s = strip([os.path.join(d, '%s_%dx.png' % (n, k)) for n in NAMES])
    s.save(os.path.join(out, 'strip_%dx.png' % k), optimize=True)
    s.save(os.path.join(out, 'strip_%dx.webp' % k), quality=80, method=6)
    print('strip %dx %dx%d:' % (k, *s.size), ', '.join('%s %s' % (a, kb(b)) for a, b in sizes(s).items()))
for layer in ('skin', 'hair', 'outfit'):
    p = [os.path.join(d, 'layer_%s_%s_2x.png' % (layer, n)) for n in NAMES]
    if all(os.path.exists(x) for x in p):
        s = strip(p)
        s.save(os.path.join(out, 'layer_%s_2x.png' % layer), optimize=True)
        print('layer %s 2x:' % layer, ', '.join('%s %s' % (a, kb(b)) for a, b in sizes(s).items()))
