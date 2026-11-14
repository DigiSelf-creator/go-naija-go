"""Test only: lay rendered frames side by side (and make sprite strips) for checking.
python3 sheet.py <frames dir> <out.png> [zoom] [suffix]"""
import os
import sys

from PIL import Image

d, out = sys.argv[1], sys.argv[2]
zoom = int(sys.argv[3]) if len(sys.argv) > 3 else 3
suffix = sys.argv[4] if len(sys.argv) > 4 else '_2x.png'
names = sorted(f for f in os.listdir(d) if f.endswith(suffix) and not f.startswith('layer_'))
order = [n for n in names if n.startswith('run')] + [n for n in names if not n.startswith('run')]
ims = [Image.open(os.path.join(d, n)) for n in order]
w, h = ims[0].size
sheet = Image.new('RGBA', (w * len(ims) * zoom, h * zoom), (236, 232, 222, 255))
for i, im in enumerate(ims):
    big = im.resize((w * zoom, h * zoom), Image.NEAREST)
    sheet.alpha_composite(big, (i * w * zoom, 0))
sheet.save(out)
print(' '.join(order))
