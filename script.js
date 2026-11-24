(() => {
  const bar = document.getElementById('tabs'), ind = document.getElementById('ind');
  const tabs = [...bar.querySelectorAll(':scope > .tab')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = tabs[0], drag = false, pid = null, sx = 0, moved = false, lock = 0;

  // Salinan tab berwarna aksen, dipotong oleh indikator kaca
  const row = document.createElement('div');
  row.className = 'row'; row.setAttribute('aria-hidden', 'true');
  tabs.forEach(t => { const c = t.cloneNode(true); c.removeAttribute('href'); row.append(c); });
  ind.append(row);

  function put(tab, x, snap) {
    if (x == null) x = tab.offsetLeft - 2;
    if (snap) ind.style.transition = row.style.transition = 'none';
    ind.style.setProperty('--x', x + 'px');
    ind.style.setProperty('--w', tab.offsetWidth + 'px');
    ind.style.setProperty('--tw', bar.clientWidth + 'px');
    if (snap) { void ind.offsetWidth; ind.style.transition = row.style.transition = ''; }
  }
  function set(t) {
    active = t;
    tabs.forEach(x => x.removeAttribute('aria-current'));
    t.setAttribute('aria-current', 'true');
    put(t);
  }
  function go(t) { // tab yang sama diketuk lagi = kembali ke awal section
    lock = performance.now() + 1100;
    set(t);
    document.getElementById(t.dataset.s).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
  function near(cx) {
    let b = tabs[0], d = 1e9;
    tabs.forEach(t => { const r = t.getBoundingClientRect(), k = Math.abs(cx - (r.left + r.width / 2)); if (k < d) { d = k; b = t; } });
    return b;
  }

  tabs.forEach(t => t.addEventListener('click', e => { e.preventDefault(); if (e.detail === 0) go(t); }));
  bar.addEventListener('contextmenu', e => e.preventDefault());
  bar.addEventListener('dragstart', e => e.preventDefault());

  // Sentuh: gelembung kaca langsung pindah ke tab yang disentuh, pilihan dipastikan saat jari diangkat
  bar.addEventListener('pointerdown', e => {
    if (drag || (e.pointerType === 'mouse' && e.button)) return;
    drag = true; pid = e.pointerId; sx = e.clientX; moved = false;
    try { bar.setPointerCapture(pid); } catch (_) {}
    bar.classList.add('press');
    put(near(e.clientX));
  });
  bar.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== pid) return;
    if (!moved && Math.abs(e.clientX - sx) < 4) return;
    moved = true; bar.classList.add('drag');
    const h = near(e.clientX), w = h.offsetWidth, l = bar.getBoundingClientRect().left;
    put(h, Math.max(0, Math.min(bar.clientWidth - 4 - w, e.clientX - l - 2 - w / 2)));
  });
  function end(e) {
    if (!drag) return;
    drag = false; bar.classList.remove('press', 'drag');
    e ? go(near(e.clientX)) : set(active);
  }
  bar.addEventListener('pointerup', e => end(e));
  addEventListener('pointercancel', () => end(null));
  bar.addEventListener('lostpointercapture', () => end(null));

  const snap = () => { if (!drag) put(active, null, true); };
  set(active); snap();
  if (document.fonts) document.fonts.ready.then(snap);
  addEventListener('load', snap);
  new ResizeObserver(snap).observe(bar);

  // Scroll spy
  const io = new IntersectionObserver(es => {
    if (drag || performance.now() < lock) return;
    es.forEach(e => {
      if (!e.isIntersecting) return;
      const t = tabs.find(x => x.dataset.s === e.target.id);
      if (t && t !== active) set(t);
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  document.querySelectorAll('main section[id]').forEach(s => io.observe(s));

  // Bar berubah gelap saat melewati bagian Kontak yang berlatar gelap
  const ct = document.getElementById('kontak');
  const tone = () => bar.classList.toggle('dk', ct.getBoundingClientRect().top < innerHeight - 50);
  addEventListener('scroll', tone, { passive: true }); tone();

  // Pembiasan di tepi kaca ala iOS (Chromium saja): peta displacement dibuat per elemen
  if (/Chrome\//.test(navigator.userAgent)) {
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute'; document.body.append(svg);
    document.querySelectorAll('.glass').forEach((el, n) => {
      const f = document.createElementNS(NS, 'filter'), im = document.createElementNS(NS, 'feImage'), dm = document.createElementNS(NS, 'feDisplacementMap');
      const at = (o, a) => Object.entries(a).forEach(([k, v]) => o.setAttribute(k, v));
      at(f, { id: 'lg' + n, x: 0, y: 0, width: 1, height: 1, 'color-interpolation-filters': 'sRGB' });
      at(im, { result: 'm', x: 0, y: 0, preserveAspectRatio: 'none' });
      at(dm, { in: 'SourceGraphic', in2: 'm', xChannelSelector: 'R', yChannelSelector: 'G', scale: 28 });
      f.append(im, dm); svg.append(f);
      const build = () => {
        const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
        if (!w || !h) return;
        const d = Math.min(devicePixelRatio || 1, 2), c = document.createElement('canvas');
        c.width = w * d; c.height = h * d;
        const g = c.getContext('2d'), img = g.createImageData(c.width, c.height), r = Math.min(w, h) / 2, b = Math.min(r, 16);
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
          const px = (x + .5) / d, py = (y + .5) / d;
          const vx = px - Math.max(r, Math.min(w - r, px)), vy = py - Math.max(r, Math.min(h - r, py));
          const dist = Math.hypot(vx, vy), e = r - dist;
          let dx = 0, dy = 0;
          if (e < b && dist > 0) { const t = 1 - Math.max(e, 0) / b, m = t * t; dx = -vx / dist * m; dy = -vy / dist * m; }
          const i = (y * c.width + x) * 4;
          img.data[i] = 128 + dx * 127; img.data[i + 1] = 128 + dy * 127; img.data[i + 2] = 128; img.data[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        at(im, { width: w, height: h, href: c.toDataURL() });
        el.style.backdropFilter = 'url(#lg' + n + ') blur(8px) saturate(170%) brightness(1.08)';
      };
      new ResizeObserver(build).observe(el);
    });
  }
})();
