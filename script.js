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
    const on = bar.classList.contains('press');
    tabs.forEach(t => t.classList.toggle('under', on && t === tab));
    if (snap) ind.style.transition = row.style.transition = 'none';
    ind.style.setProperty('--x', x + 'px');
    ind.style.setProperty('--w', tab.offsetWidth + 'px');
    ind.style.setProperty('--tw', bar.clientWidth + 'px');
    ind.style.setProperty('--cx', (x + 2 + tab.offsetWidth / 2) + 'px');
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

  // Pembiasan tepi ala iOS (Chromium saja): peta displacement per elemen, plus dispersi warna di gelembung
  if (/Chrome\//.test(navigator.userAgent)) {
    document.documentElement.classList.add('lens');
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute'; document.body.append(svg);
    const mk = (n, a) => { const o = document.createElementNS(NS, n); Object.entries(a).forEach(([k, v]) => o.setAttribute(k, v)); return o; };
    const CH = { r: '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0', g: '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0', b: '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0' };
    function lens(el, id, bez, max, chroma, fx) {
      const f = mk('filter', { id, x: 0, y: 0, width: 1, height: 1, 'color-interpolation-filters': 'sRGB' });
      const im = mk('feImage', { result: 'm', x: 0, y: 0, preserveAspectRatio: 'none' });
      const dm = (s, res) => mk('feDisplacementMap', { in: 'SourceGraphic', in2: 'm', scale: s, xChannelSelector: 'R', yChannelSelector: 'G', result: res });
      f.append(im);
      if (chroma) {
        [['r', .8], ['g', 1], ['b', 1.2]].forEach(([c, k]) => f.append(dm(max * 2 * k, 'd' + c), mk('feColorMatrix', { in: 'd' + c, type: 'matrix', values: CH[c], result: c })));
        f.append(mk('feBlend', { in: 'r', in2: 'g', mode: 'screen', result: 'rg' }), mk('feBlend', { in: 'rg', in2: 'b', mode: 'screen' }));
      } else f.append(dm(max * 2));
      svg.append(f);
      const build = () => {
        const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
        if (!w || !h) return;
        const d = Math.min(devicePixelRatio || 1, 2), c = document.createElement('canvas');
        c.width = w * d; c.height = h * d;
        const g = c.getContext('2d'), img = g.createImageData(c.width, c.height), r = Math.min(w, h) / 2, b = Math.min(r, bez);
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
        im.setAttribute('width', w); im.setAttribute('height', h); im.setAttribute('href', c.toDataURL());
        if (fx) el.style.backdropFilter = 'url(#' + id + ') ' + fx;
      };
      // Bangun ulang peta maksimal sekali per frame (gelembung berubah ukuran saat ditekan)
      let raf = 0;
      new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(build); }).observe(el);
    }
    lens(document.querySelector('.bgl'), 'lgB', 16, 14, false, 'blur(14px) saturate(180%) brightness(1.08)');
    lens(ind, 'lgI', 18, 12, true, null);
    document.querySelectorAll('.glass:not(.tabs)').forEach((el, n) => lens(el, 'lg' + n, 16, 14, false, 'blur(8px) saturate(170%) brightness(1.08)'));

    // Bulan sabit RGB ala iOS 26: hanya di bagian gelembung yang keluar dari bar (atas-bawah, atau ujung kiri-kanan).
    // Hanya pinggiran warnanya yang digambar; bagian tengah sabit transparan agar warnanya mengikuti latar di belakang (kaca bening).
    const CAP = [[0, 255, 245, 210, .35], [.1, 160, 230, 110, .45], [.2, 255, 45, 45, .8], [.3, 255, 60, 80, 0], [.68, 30, 70, 255, 0], [.76, 30, 70, 255, .8], [.85, 40, 210, 235, .6], [.93, 90, 230, 110, .4], [1, 255, 160, 90, 0]];
    const pal = t => { let k = 1; while (k < CAP.length - 1 && CAP[k][0] < t) k++; const a = CAP[k - 1], z = CAP[k], u = (t - a[0]) / (z[0] - a[0]); return a.slice(1).map((v, j) => v + (z[j + 1] - v) * u); };
    // Jarak bertanda ke bentuk kapsul: negatif = di dalam
    const sd = (px, py, x0, y0, w, h) => { const r = Math.min(w, h) / 2, vx = px - Math.max(x0 + r, Math.min(x0 + w - r, px)), vy = py - Math.max(y0 + r, Math.min(y0 + h - r, py)); return Math.hypot(vx, vy) - r; };
    let last = '', rimRaf = 0, until = 0;
    function rimBuild() {
      const w = ind.offsetWidth, h = ind.offsetHeight;
      if (!w || !h) return;
      const A = ind.getBoundingClientRect(), B = bar.getBoundingClientRect(), k = A.width / w || 1;
      const bx = (B.left - A.left) / k, by = (B.top - A.top) / k, bw = B.width / k, bh = B.height / k;
      const key = [w, h, bx, by, bw, bh].map(Math.round).join();
      if (key === last) return;
      last = key;
      const d = Math.min(devicePixelRatio || 1, 2), c = document.createElement('canvas');
      c.width = Math.round(w * d); c.height = Math.round(h * d);
      const cx = c.getContext('2d'), img = cx.createImageData(c.width, c.height);
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        const px = (x + .5) / d, py = (y + .5) / d, e1 = -sd(px, py, 0, 0, w, h);
        if (e1 < 0) continue;
        const e2 = sd(px, py, bx, by, bw, bh);
        if (e2 <= 0) continue;
        const [cr, cg, cb, ca] = pal(e1 / (e1 + e2)), i = (y * c.width + x) * 4;
        img.data[i] = cr; img.data[i + 1] = cg; img.data[i + 2] = cb; img.data[i + 3] = 255 * ca;
      }
      cx.putImageData(img, 0, 0);
      ind.style.setProperty('--rim', 'url(' + c.toDataURL() + ')');
    }
    // Ikuti posisi gelembung tiap frame selama ditekan/digeser, dan sebentar setelah dilepas
    const tick = () => { rimBuild(); rimRaf = (bar.classList.contains('press') || performance.now() < until) ? requestAnimationFrame(tick) : 0; };
    new MutationObserver(() => {
      if (!bar.classList.contains('press')) until = performance.now() + 600;
      if (!rimRaf) rimRaf = requestAnimationFrame(tick);
    }).observe(bar, { attributes: true, attributeFilter: ['class'] });
  }
})();