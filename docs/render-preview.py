"""Render the plugin's detail image from its HTML source.

The source of truth is ``docs/preview-source.html``: the artwork is drawn live
there from a JSON scene embedded in the page, so it can be opened in a browser
and edited. This script parses that same scene and rasterises it with Pillow at
four times the canvas size, then downsamples with LANCZOS, which gives clean
small text and smooth rounded corners — the difference against drawing directly
at 640x300 is large enough to be worth the extra pass.

Run with the Python that ships with the DSH runtime, which carries Pillow:

    C:\\Users\\liang\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe \\
        docs/render-preview.py

It writes ``preview.png`` (English) and ``preview.zh.png`` (Chinese) beside
itself and is idempotent: the same scene always produces the same bytes.

The canvas is 640x300, the size the plugin detail page reserves for its feature
image. Coordinates come from the scene, so changing the layout there changes it
here too; the panel is an opaque dark surface so both themes render it
identically.

Composition: the two capabilities the plugin registers on the ctx.web seam, as
the model-facing tools render them. Left, ``web_search``: a GET against the
search host, then ranked results carrying a title, a portable snippet and a
publication date. Right, ``web_fetch``: a POST against the fetch host, then the
page as markdown. Bottom, the provider itself — the search glyph from
``icon.svg``, the one credential both capabilities need, and the two provider
pins the patch writes.

TinyFish serves the two capabilities from different hosts and requires an
``X-API-Key`` on both, with no keyless fallback; both host lines are drawn, and
the provider card says so rather than naming a fallback that does not exist.

@module dsh-web-search-tinyfish/render-preview
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

#: Rendered at this multiple of the canvas, then downsampled.
SUPERSAMPLE = 4

#: Where the fonts live. Segoe UI covers Latin, Microsoft YaHei covers Chinese,
#: and Consolas covers the host lines, the query, and the URL.
FONTS = {
    'latin': Path(r'C:\Windows\Fonts\segoeui.ttf'),
    'latin_bold': Path(r'C:\Windows\Fonts\segoeuib.ttf'),
    'cjk': Path(r'C:\Windows\Fonts\msyh.ttc'),
    'cjk_bold': Path(r'C:\Windows\Fonts\msyhbd.ttc'),
    'mono': Path(r'C:\Windows\Fonts\consola.ttf'),
}

#: One palette, resolved once per size so the hot loop stays allocation-free.
_FONT_CACHE: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}


def font(kind: str, px: float) -> ImageFont.FreeTypeFont:
    """One font instance per (kind, size), since Pillow re-parses otherwise."""
    key = (kind, round(px))
    if key not in _FONT_CACHE:
        _FONT_CACHE[key] = ImageFont.truetype(str(FONTS[kind]), round(px))
    return _FONT_CACHE[key]


def scene_of(html: str) -> dict:
    """The scene embedded in the page, parsed as JSON.

    @param html - the whole HTML document.
    @returns the scene object.
    @throws ValueError when the page carries no usable scene.
    """
    match = re.search(
        r'<script[^>]*type="application/json"[^>]*id="scene"[^>]*>(.*?)</script>',
        html,
        re.DOTALL,
    )
    if match is None:
        raise ValueError('preview-source.html carries no scene script')
    return json.loads(match.group(1))


class Canvas:
    """A drawing surface at the supersampled size, in canvas units."""

    def __init__(self, width: int, height: int, background: str) -> None:
        self.width = width
        self.height = height
        self.image = Image.new('RGB', (width * SUPERSAMPLE, height * SUPERSAMPLE), background)
        self.draw = ImageDraw.Draw(self.image)

    def _box(self, x: float, y: float, w: float, h: float) -> tuple[int, int, int, int]:
        return (round(x * SUPERSAMPLE), round(y * SUPERSAMPLE),
                round((x + w) * SUPERSAMPLE), round((y + h) * SUPERSAMPLE))

    def rect(self, x, y, w, h, fill=None, radius=0, outline=None, width=1):
        """A rounded rectangle; `radius` is in canvas units."""
        box = self._box(x, y, w, h)
        if radius > 0:
            self.draw.rounded_rectangle(box, radius=round(radius * SUPERSAMPLE),
                                        fill=fill, outline=outline,
                                        width=round(width * SUPERSAMPLE) if outline else 0)
        else:
            self.draw.rectangle(box, fill=fill, outline=outline,
                                width=round(width * SUPERSAMPLE) if outline else 0)

    def circle(self, cx, cy, r, fill=None, outline=None, width=1):
        self.draw.ellipse((round((cx - r) * SUPERSAMPLE), round((cy - r) * SUPERSAMPLE),
                           round((cx + r) * SUPERSAMPLE), round((cy + r) * SUPERSAMPLE)),
                          fill=fill, outline=outline,
                          width=round(width * SUPERSAMPLE) if outline else 0)

    def line(self, points, fill, width):
        self.draw.line([(round(x * SUPERSAMPLE), round(y * SUPERSAMPLE)) for x, y in points],
                       fill=fill, width=round(width * SUPERSAMPLE), joint='curve')

    def polyline(self, points, fill, width):
        """An open polyline with round caps, for the glyph strokes."""
        self.line(points, fill, width)
        for x, y in (points[0], points[-1]):
            self.circle(x, y, width / 2, fill=fill)

    def text(self, x, y, body, kind, px, fill, anchor='la', bold=False):
        """Draw text with its anchor point at (x, y) in canvas units.

        Pillow's anchors are `l`, `m` and `a` for left, middle and ascender, so
        `la` is the default and `lm` centres a row vertically.
        """
        self.draw.text((round(x * SUPERSAMPLE), round(y * SUPERSAMPLE)), body,
                       font=font(kind, px * SUPERSAMPLE), fill=fill, anchor=anchor)

    def measure(self, body, kind, px, bold=False) -> float:
        """The rendered width in canvas units, for right-alignment and caps."""
        return self.draw.textlength(body, font=font(kind, px * SUPERSAMPLE)) / SUPERSAMPLE

    def fit(self, body, kind, px, limit, bold=False) -> float:
        """The largest size up to `px` whose rendering stays within `limit`.

        @param body - the text to measure.
        @param kind - which font family to use.
        @param px - the preferred size in canvas units.
        @param limit - the widest allowed rendering, in canvas units.
        @param bold - whether the bold face is meant, for cache identity.
        @returns the size to draw at, never larger than `px`.
        """
        if self.measure(body, kind, px, bold) <= limit:
            return px
        size = px
        while size > 7 and self.measure(body, kind, size, bold) > limit:
            size -= 0.5
        return size

    def accent(self, x, y, w, h, fill, radius):
        """A top accent bar clipped to the card's rounded corners.

        A square-cornered bar laid over a rounded card overhangs at both top
        corners, which reads as a misalignment rather than a design choice. The
        clip is the card's own shape, so the bar follows it exactly.

        @param x, y - the card's top-left, in canvas units.
        @param w, h - the card's width and the bar's height.
        @param fill - the bar's colour.
        @param radius - the card's corner radius, in canvas units.
        """
        # The clip is the card's top section: rounded at the top, square where
        # the bar ends, so nothing below the bar is tinted.
        mask = Image.new('L', self.image.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            (round(x * SUPERSAMPLE), round(y * SUPERSAMPLE),
             round((x + w) * SUPERSAMPLE), round((y + h + radius) * SUPERSAMPLE)),
            radius=round(radius * SUPERSAMPLE), fill=255)
        self.image.paste(Image.new('RGB', self.image.size, fill), (0, 0), mask)

    def downsample(self) -> Image.Image:
        """The final image at canvas size."""
        return self.image.resize((self.width, self.height), Image.LANCZOS)


def draw_scene(scene: dict, lang: str) -> Image.Image:
    """One language variant of the artwork.

    @param scene - the parsed scene.
    @param lang - `en` or `zh`, choosing the text set.
    @returns the rendered image at canvas size.
    """
    text = scene['text'][lang]
    colors = scene['colors']
    panel = scene['panel']

    canvas = Canvas(scene['width'], scene['height'], panel['fill'])
    cjk = lang == 'zh'
    body = 'cjk' if cjk else 'latin'
    strong = 'cjk_bold' if cjk else 'latin_bold'

    # ---- left: web_search ------------------------------------------------
    search = scene['search']
    canvas.rect(search['x'], search['y'], search['w'], search['h'], fill=colors['card'],
                radius=search['r'], outline=colors['cardEdge'])
    canvas.accent(search['x'], search['y'], search['w'], search['bar']['h'],
                  search['bar']['fill'], search['r'])

    canvas.text(search['titleX'], search['titleY'], text['searchTitle'], strong, 13, colors['text'])

    # The host line, in the monospaced face: it names the real search host, and
    # both capabilities have their own, so it is drawn rather than described.
    host = search['host']
    canvas.rect(host['x'], host['y'], host['w'], host['h'], fill=colors['cardSoft'],
                radius=host['r'])
    canvas.text(host['x'] + 12, host['y'] + host['h'] / 2, text['searchHost'],
                'mono', 10.5, colors['accentSoft'], anchor='lm')

    query = search['query']
    canvas.rect(query['x'], query['y'], query['w'], query['h'], fill=colors['cardSoft'],
                radius=query['r'])
    # The query is ASCII in both languages, exactly as the sibling preview keeps
    # its command line: Consolas has no CJK, and a substituted face there is a
    # visible seam in the middle of the card.
    canvas.text(query['x'] + 12, query['y'] + query['h'] / 2, text['query'],
                'mono', 11, colors['text'], anchor='lm')

    for index, result in enumerate(search['results']):
        canvas.text(search['textX'], result['titleY'], text['resultTitles'][index],
                    strong, 10.5, colors['text'])
        # The publication date, right-aligned against the card's inner edge so
        # it reads as metadata of the result rather than as a fourth column.
        date_x = result['dateX']
        date_px = canvas.fit(text['dates'][index], 'mono', 9.5,
                             date_x - (search['textX'] + 24))
        canvas.text(date_x, result['titleY'] + 4, text['dates'][index],
                    'mono', date_px, colors['textDim'], anchor='ra')
        canvas.text(search['textX'], result['snippetY'], text['resultSnippets'][index],
                    body, 9.5, colors['textDim'])

    # ---- right: web_fetch -------------------------------------------------
    fetch = scene['fetch']
    canvas.rect(fetch['x'], fetch['y'], fetch['w'], fetch['h'], fill=colors['card'],
                radius=fetch['r'], outline=colors['cardEdge'])
    canvas.accent(fetch['x'], fetch['y'], fetch['w'], fetch['bar']['h'],
                  fetch['bar']['fill'], fetch['r'])

    canvas.text(fetch['titleX'], fetch['titleY'], text['fetchTitle'], strong, 13, colors['text'])

    # The other host: TinyFish serves search and fetch from different hosts, so
    # the two cards do not share an endpoint base.
    fetch_host = fetch['host']
    canvas.rect(fetch_host['x'], fetch_host['y'], fetch_host['w'], fetch_host['h'],
                fill=colors['cardSoft'], radius=fetch_host['r'])
    canvas.text(fetch_host['x'] + 12, fetch_host['y'] + fetch_host['h'] / 2,
                text['fetchHost'], 'mono', 10.5, colors['accentSoft'], anchor='lm')

    url = fetch['url']
    canvas.rect(url['x'], url['y'], url['w'], url['h'], fill=colors['cardSoft'], radius=url['r'])
    # The URL is ASCII in both languages, like the query: it names a real host
    # and a real path, and localising it would name a host that does not exist.
    canvas.text(url['x'] + 12, url['y'] + url['h'] / 2, text['url'],
                'mono', 11, colors['text'], anchor='lm')

    # The markdown body, with the heading the provider prepends when the page
    # text does not already open with its title.
    body_box = fetch['body']
    canvas.rect(body_box['x'], body_box['y'], body_box['w'], body_box['h'],
                fill=colors['cardSoft'], radius=body_box['r'])
    canvas.text(body_box['x'] + 12, fetch['mdTitleY'], text['mdTitle'], strong, 11.5, colors['text'])
    body_px = canvas.fit(text['mdBody'], body, 10, body_box['w'] - 28)
    canvas.text(body_box['x'] + 16, fetch['bodyY'], text['mdBody'], body, body_px, colors['textDim'])

    # ---- bottom: the provider --------------------------------------------
    provider = scene['provider']
    canvas.rect(provider['x'], provider['y'], provider['w'], provider['h'],
                fill=colors['cardSoft'], radius=provider['r'], outline=colors['cardEdge'])

    # The search glyph, matching the plugin's own icon.svg: a ringed lens and a
    # handle leaving it along the diagonal, both with round caps.
    lens = provider['lens']
    canvas.circle(lens['cx'], lens['cy'], lens['r'], outline=colors['accent'], width=2.2)
    canvas.polyline([(lens['cx'] + lens['r'] * 0.72, lens['cy'] + lens['r'] * 0.72),
                     (lens['cx'] + lens['handle'], lens['cy'] + lens['handle'])],
                    colors['accent'], 2.4)

    canvas.text(provider['textX'], provider['titleY'], text['providerTitle'],
                strong, 12, colors['text'], bold=True)
    canvas.text(provider['textX'], provider['noteY'], text['providerNote'],
                body, 10, colors['textDim'])

    # The two provider pins the patch writes into the profile, key dim and value
    # in the icon's own accent so the eye lands on what is pinned.
    for index, (key, value) in enumerate(text['config']):
        y = provider['configY'][index]
        canvas.text(provider['configX'], y, f'{key}: ', 'mono', 10.5, colors['textDim'], anchor='lm')
        # The value starts after the key it belongs to, so the pair stays one
        # column instead of two that have to be aligned by hand.
        value_x = provider['configX'] + canvas.measure(f'{key}: ', 'mono', 10.5)
        canvas.text(value_x, y, value, 'mono', 10.5, colors['accentSoft'], anchor='lm')

    return canvas.downsample()


def main() -> int:
    """Render every language variant beside this script.

    @returns the process exit code.
    """
    here = Path(__file__).resolve().parent
    html_path = here / 'preview-source.html'
    scene = scene_of(html_path.read_text(encoding='utf-8'))

    missing = [str(path) for path in FONTS.values() if not path.exists()]
    if missing:
        print('missing font(s): ' + ', '.join(missing), file=sys.stderr)
        return 1

    written = []
    for lang, suffix in (('en', ''), ('zh', '.zh')):
        image = draw_scene(scene, lang)
        target = here / f'preview{suffix}.png'
        image.save(target, 'PNG', optimize=True)
        written.append(f'{target.name}  {target.stat().st_size} bytes')

    for line in written:
        print(line)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
