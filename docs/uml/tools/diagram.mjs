// Tiny SVG builder for UML component diagrams with ball-and-socket interfaces, ports and sub systems.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const INK = '#1B3A57', LINE = '#1B5E8C', BLUE = '#7FD3F7', PALE = '#F2FAFE', NOTE = '#FFF8D6';

export class Diagram {
  constructor(w, h, title) { this.w = w; this.h = h; this.title = title; this.parts = []; this.nodes = {}; }
  add(s) { this.parts.push(s); }
  text(x, y, t, o = {}) {
    this.add(`<text x="${x}" y="${y}" font-size="${o.size || 13}" font-weight="${o.bold ? 700 : 400}" fill="${o.fill || INK}" text-anchor="${o.anchor || 'start'}" font-style="${o.italic ? 'italic' : 'normal'}">${esc(t)}</text>`);
  }
  icon(x, y) { // UML component icon, top-right corner at (x, y)
    this.add(`<g stroke="${LINE}" fill="#fff" stroke-width="1.2"><rect x="${x - 18}" y="${y + 6}" width="16" height="12"/><rect x="${x - 22}" y="${y + 9}" width="8" height="3"/><rect x="${x - 22}" y="${y + 14}" width="8" height="3"/></g>`);
  }
  sub(id, label, x, y, w, h, stereotype = 'sub system') {
    this.nodes[id] = { x, y, w, h };
    this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${PALE}" stroke="${LINE}" stroke-width="1.6"/>`);
    this.text(x + w / 2, y + 20, label, { bold: true, anchor: 'middle', size: 14 });
    this.text(x + w / 2, y + 36, '<<' + stereotype + '>>', { anchor: 'middle', size: 11.5, fill: '#27506F' });
    this.icon(x + w - 6, y + 4);
  }
  comp(id, label, x, y, w, h, o = {}) {
    this.nodes[id] = { x, y, w, h };
    this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${o.fill || BLUE}" stroke="${LINE}" stroke-width="1.3"/>`);
    const widest = Math.max(...String(label).split('\n').map((l) => l.length)) * 7.6;
    if (!o.noIcon && widest < w - 34) this.icon(x + w - 4, y + 2);
    const lines = String(label).split('\n');
    lines.forEach((l, i) => this.text(x + 10, y + 21 + i * 16, l, { bold: true, size: 13.5 }));
    let yy = y + 21 + lines.length * 16 + 2;
    (o.sub || []).forEach((l) => { this.text(x + 10, yy, l, { size: 11, fill: '#27506F' }); yy += 14; });
  }
  port(id, x, y) {
    this.nodes[id] = { x: x - 7, y: y - 7, w: 14, h: 14 };
    this.add(`<rect x="${x - 7}" y="${y - 7}" width="14" height="14" fill="#fff" stroke="${INK}" stroke-width="1.6"/>`);
  }
  pt(ref) { // 'id.side@frac' -> [x, y]
    const m = /^(\w+)\.([tblr])(?:@([\d.]+))?$/.exec(ref);
    if (!m) throw new Error('bad ref ' + ref);
    const n = this.nodes[m[1]]; if (!n) throw new Error('unknown ' + m[1]);
    const f = m[3] === undefined ? 0.5 : parseFloat(m[3]);
    if (m[2] === 't') return [n.x + n.w * f, n.y];
    if (m[2] === 'b') return [n.x + n.w * f, n.y + n.h];
    if (m[2] === 'l') return [n.x, n.y + n.h * f];
    return [n.x + n.w, n.y + n.h * f];
  }
  poly(points, o = {}) {
    const d = points.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
    this.add(`<path d="${d}" fill="none" stroke="${o.stroke || LINE}" stroke-width="${o.w || 1.5}" ${o.dash ? 'stroke-dasharray="6 4"' : ''} ${o.arrow ? 'marker-end="url(#arrow)"' : ''}/>`);
  }
  // Ball and socket: points go from the PROVIDER end to the CONSUMER end (orthogonal polyline).
  assembly(points, label, o = {}) {
    // pick the segment holding the middle of the path
    const segs = []; let total = 0;
    for (let i = 0; i < points.length - 1; i++) { const l = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]); segs.push(l); total += l; }
    let at = total * (o.pos ?? 0.5); let k = 0;
    while (k < segs.length - 1 && at > segs[k]) { at -= segs[k]; k++; }
    const [a, b] = [points[k], points[k + 1]];
    const dx = (b[0] - a[0]) / segs[k], dy = (b[1] - a[1]) / segs[k];
    const M = [a[0] + dx * at, a[1] + dy * at];
    const B = M, rb = 6.5, rs = 11;
    const pre = [...points.slice(0, k + 1), [B[0] - dx * rb, B[1] - dy * rb]];
    const post = [[B[0] + dx * rs, B[1] + dy * rs], ...points.slice(k + 1)];
    this.poly(pre); this.poly(post);
    this.add(`<circle cx="${B[0]}" cy="${B[1]}" r="${rb}" fill="#fff" stroke="${LINE}" stroke-width="1.5"/>`);
    const nx = -dy, ny = dx;
    const p1 = [B[0] + nx * rs, B[1] + ny * rs], p2 = [B[0] - nx * rs, B[1] - ny * rs];
    this.add(`<path d="M${p1[0]} ${p1[1]} A ${rs} ${rs} 0 0 0 ${p2[0]} ${p2[1]}" fill="none" stroke="${LINE}" stroke-width="1.5"/>`);
    if (label) {
      const horiz = Math.abs(dx) > Math.abs(dy);
      const lx = horiz ? B[0] : B[0] + 16, ly = horiz ? B[1] - 16 : B[1] + 4;
      this.text(o.lx ?? lx, o.ly ?? ly, label, { size: 11.5, anchor: o.anchor || (horiz ? 'middle' : 'start'), fill: '#14425F', bold: true });
    }
  }
  dep(points, label, o = {}) {
    this.poly(points, { dash: true, arrow: true });
    if (label) { const m = points[Math.floor(points.length / 2)]; this.text(o.lx ?? m[0] + 6, o.ly ?? m[1] - 6, label, { size: 11, italic: true }); }
  }
  note(x, y, w, title, lines) {
    const h = 26 + lines.length * 15;
    this.add(`<path d="M${x} ${y} h${w - 14} l14 14 v${h - 14} h-${w} z" fill="${NOTE}" stroke="#C9A227" stroke-width="1"/>`);
    this.text(x + 8, y + 18, title, { bold: true, size: 12 });
    lines.forEach((l, i) => this.text(x + 8, y + 36 + i * 15, l, { size: 11 }));
    return h;
  }
  svg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}" font-family="DejaVu Sans, Arial, sans-serif">
<defs><marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0 0 L10 4 L0 8 z" fill="${LINE}"/></marker></defs>
<rect width="100%" height="100%" fill="#fff"/>
<text x="${this.w / 2}" y="26" font-size="17" font-weight="700" text-anchor="middle" fill="#000">${esc(this.title)}</text>
${this.parts.join('\n')}
</svg>`;
  }
}
