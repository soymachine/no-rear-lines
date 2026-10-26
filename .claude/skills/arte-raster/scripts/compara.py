#!/usr/bin/env python3
"""Lámina antes/después de dos dibujos (PNG a tamaño real, los de captura.mjs), ampliados sin suavizar.

Uso: python3 compara.py antes.png despues.png salida.png [--x N] [--diff]
  --x N    aumento (por defecto, el que deja el más alto en unos 400 px)
  --diff   añade un tercer panel con los píxeles que cambian (en magenta sobre el antes apagado)
"""
import sys
from PIL import Image, ImageDraw


def main(argv):
    argv = list(argv)
    x = None
    if '--x' in argv:
        i = argv.index('--x')
        x = int(argv[i + 1])
        del argv[i:i + 2]
    args = [a for a in argv if not a.startswith('--')]
    if len(args) < 3:
        print(__doc__)
        return 2
    a, b = (Image.open(p).convert('RGBA') for p in args[:2])
    out = args[2]
    k = x or max(1, 400 // max(a.height, b.height))
    panels = [('ANTES', a), ('DESPUES', b)]
    if '--diff' in argv:
        w, h = max(a.width, b.width), max(a.height, b.height)
        pa, pb = Image.new('RGBA', (w, h)), Image.new('RGBA', (w, h))
        pa.paste(a, (0, 0))
        pb.paste(b, (0, 0))
        d = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        da, db, dd = pa.load(), pb.load(), d.load()
        n = 0
        for j in range(h):
            for i in range(w):
                if da[i, j] != db[i, j]:
                    dd[i, j] = (255, 0, 255, 255)
                    n += 1
                else:
                    r, g, bb, al = da[i, j]
                    dd[i, j] = (r // 4, g // 4, bb // 4, al)
        panels.append((f'CAMBIOS ({n} px)', d))
    pad, top = 12, 18
    W = sum(p.width * k for _, p in panels) + pad * (len(panels) + 1)
    H = max(p.height * k for _, p in panels) + pad * 2 + top
    sheet = Image.new('RGBA', (W, H), (5, 3, 2, 255))
    dr = ImageDraw.Draw(sheet)
    cx = pad
    for label, p in panels:
        dr.text((cx, pad // 2), label, fill=(255, 176, 64, 255))
        big = p.resize((p.width * k, p.height * k), Image.NEAREST)
        sheet.paste(big, (cx, pad + top), big)  # lo transparente deja ver el fondo del juego
        cx += p.width * k + pad
    sheet.save(out)
    print(f'{out}  ×{k}  {a.width}×{a.height} → {b.width}×{b.height}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
