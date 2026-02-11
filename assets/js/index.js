/* assets/js/effects.js
   Rich, performance-friendly micro-interactions (no external libs)
   Works with your current HTML structure.

   Features:
   - Scroll progress bar
   - Reveal-on-scroll + stagger
   - Active nav highlight
   - Cursor spotlight vars: --mx --my
   - Hero parallax vars: --hx --hy --hs
   - Card tilt (desktop only)
   - Magnetic hover: [data-magnetic]
   - Ripple click: [data-ripple]
   - Typewriter: [data-type]
   - Count-up: [data-count]
   - Smooth anchor scroll (optional)
*/

(() => {
  const prefersReduced = Boolean(
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const $ = (sel, root = document) => root.querySelector(sel);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const rafThrottle = (fn) => {
    let raf = 0;
    return (...args) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        fn(...args);
      });
    };
  };

  const isFinePointer = () =>
    Boolean(window.matchMedia && window.matchMedia("(pointer: fine)").matches);

  // ==============
  // Boot marker (debug)
  // ==============
  document.documentElement.classList.add("fx-on");

  // ==============
  // Year
  // ==============
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ==============
  // Mobile nav
  // ==============
  (() => {
    const btn = $(".menu-btn");
    const nav = $("#primary-nav");
    if (!btn || !nav) return;

    const close = () => {
      nav.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    };

    btn.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.tagName === "A" && nav.classList.contains("is-open")) close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    document.addEventListener("pointerdown", (e) => {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(e.target) || btn.contains(e.target)) return;
      close();
    });
  })();

  // ==============
  // Scroll progress
  // ==============
  (() => {
    const bar = $(".scroll-progress__bar");
    if (!bar) return;

    let lastTop = (document.documentElement.scrollTop || 0);
    let lastTime = performance.now();

    const update = () => {
      const doc = document.documentElement;
      const top = doc.scrollTop || document.body.scrollTop || 0;
      const max = (doc.scrollHeight - doc.clientHeight) || 1;

      const p = clamp(top / max, 0, 1);
      bar.style.width = `${p * 100}%`;

      // glow intensity by scroll speed (nice subtle effect)
      const now = performance.now();
      const dt = Math.max(16, now - lastTime);
      const speed = Math.abs(top - lastTop) / dt; // px/ms
      const glow = clamp(speed * 10, 0, 1);
      bar.style.filter = `brightness(${1 + glow * 0.8})`;

      lastTop = top;
      lastTime = now;
    };

    const onScroll = rafThrottle(update);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  })();

  // ==============
  // Cursor spotlight (CSS reads --mx --my)
  // ==============
  (() => {
    if (prefersReduced) return;
    const root = document.documentElement;

    const onMove = rafThrottle((e) => {
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      root.style.setProperty("--mx", `${(e.clientX / vw) * 100}%`);
      root.style.setProperty("--my", `${(e.clientY / vh) * 100}%`);
    });

    window.addEventListener("pointermove", onMove, { passive: true });
  })();

  // ==============
  // Reveal on scroll + stagger
  // ==============
  (() => {
    if (prefersReduced) return;

    const candidates = [
      ...$$(".edu-card"),
      ...$$(".award-item"),
      ...$$(".projects-grid .card"),
      ...$$(".contact-card"),
      ...$$(".about > *"),
      ...$$(".hero > *"),
      ...$$(".footer-top, .footer-bottom")
    ].filter(Boolean);

    candidates.forEach((el) => el.classList.add("reveal"));

    // Stagger delays inside grids/lists
    const addStagger = (containerSel, childSel) => {
      const containers = $$(containerSel);
      containers.forEach((wrap) => {
        const items = $$(childSel, wrap).filter((x) => x.classList.contains("reveal"));
        items.forEach((el, idx) => {
          el.style.transitionDelay = `${Math.min(idx * 70, 420)}ms`;
        });
      });
    };

    addStagger(".edu-grid", ".edu-card");
    addStagger(".projects-grid", ".card");
    addStagger(".awards-list", ".award-item");
    addStagger(".contact-grid", ".contact-card");

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -10% 0px" }
    );

    candidates.forEach((el) => io.observe(el));
  })();

  // ==============
  // Active nav highlight by visible section
  // ==============
  (() => {
    const links = $$(".site-nav a.nav-link").filter((a) =>
      (a.getAttribute("href") || "").startsWith("#")
    );
    if (!links.length) return;

    const sections = links
      .map((a) => document.querySelector(a.getAttribute("href")))
      .filter(Boolean);

    const setActive = (id) => {
      links.forEach((a) => {
        a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`);
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target?.id) setActive(visible.target.id);
      },
      { threshold: [0.18, 0.3, 0.45, 0.6], rootMargin: "-20% 0px -65% 0px" }
    );

    sections.forEach((s) => io.observe(s));
  })();

  // ==============
  // Hero parallax vars: --hx --hy --hs (optional if you have CSS)
  // ==============
  (() => {
    if (prefersReduced) return;

    const hero = $(".hero");
    if (!hero) return;
    const root = document.documentElement;

    const onMove = rafThrottle((e) => {
      if (!isFinePointer()) return;
      const r = hero.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / Math.max(1, r.width);
      const dy = (e.clientY - cy) / Math.max(1, r.height);
      root.style.setProperty("--hx", `${clamp(dx, -0.6, 0.6)}`);
      root.style.setProperty("--hy", `${clamp(dy, -0.6, 0.6)}`);
    });

    const onScroll = rafThrottle(() => {
      const r = hero.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const t = clamp(1 - (r.bottom / (vh + r.height)), 0, 1);
      root.style.setProperty("--hs", `${t}`);
    });

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  })();

  // ==============
  // Card tilt (desktop)
  // ==============
  (() => {
    if (prefersReduced) return;
    if (!isFinePointer()) return;

    const cards = $$(".card, .edu-card, .contact-card");
    if (!cards.length) return;

    cards.forEach((el) => el.classList.add("tilt"));

    const onMove = (el, e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;

      const maxDeg = 10;
      const ry = (px - 0.5) * (maxDeg * 2);
      const rx = (0.5 - py) * (maxDeg * 2);

      el.style.setProperty("--rx", `${clamp(rx, -maxDeg, maxDeg)}deg`);
      el.style.setProperty("--ry", `${clamp(ry, -maxDeg, maxDeg)}deg`);
      el.style.setProperty("--ty", `-2px`);
    };

    const reset = (el) => {
      el.style.setProperty("--rx", `0deg`);
      el.style.setProperty("--ry", `0deg`);
      el.style.setProperty("--ty", `0px`);
    };

    cards.forEach((el) => {
      el.addEventListener("pointermove", (e) => onMove(el, e), { passive: true });
      el.addEventListener("pointerleave", () => reset(el));
      el.addEventListener("blur", () => reset(el));
    });
  })();

  // ==============
  // Magnetic hover: [data-magnetic="12"]
  // Auto-apply to .btn and .footer-pill for your page
  // ==============
  (() => {
    if (prefersReduced) return;
    if (!isFinePointer()) return;

    // auto add magnetic to some elements (safe)
    $$(".btn, .footer-pill").forEach((el) => {
      if (!el.hasAttribute("data-magnetic")) el.setAttribute("data-magnetic", "10");
    });

    const items = $$("[data-magnetic]");
    if (!items.length) return;

    items.forEach((el) => {
      const strength = Number(el.getAttribute("data-magnetic") || 10);

      const move = rafThrottle((e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        el.style.transform = `translate(${clamp(x, -1, 1) * strength}px, ${clamp(y, -1, 1) * strength}px)`;
      });

      const reset = () => (el.style.transform = "translate(0px, 0px)");

      el.addEventListener("pointermove", move, { passive: true });
      el.addEventListener("pointerleave", reset);
      el.addEventListener("blur", reset);
    });
  })();

  // ==============
  // Ripple click: [data-ripple]
  // Auto-apply to .btn
  // ==============
  (() => {
    // auto add ripple to buttons/links styled as buttons
    $$(".btn").forEach((el) => {
      if (!el.hasAttribute("data-ripple")) el.setAttribute("data-ripple", "");
    });

    const els = $$("[data-ripple]");
    if (!els.length) return;

    const ensureStyle = (el) => {
      const cs = getComputedStyle(el);
      if (cs.position === "static") el.style.position = "relative";
      if (cs.overflow === "visible") el.style.overflow = "hidden";
    };

    els.forEach((el) => {
      ensureStyle(el);
      el.addEventListener("pointerdown", (e) => {
        const r = el.getBoundingClientRect();
        const size = Math.max(r.width, r.height) * 1.25;
        const x = e.clientX - r.left - size / 2;
        const y = e.clientY - r.top - size / 2;

        const s = document.createElement("span");
        s.style.position = "absolute";
        s.style.left = `${x}px`;
        s.style.top = `${y}px`;
        s.style.width = `${size}px`;
        s.style.height = `${size}px`;
        s.style.borderRadius = "999px";
        s.style.pointerEvents = "none";
        s.style.opacity = "0.22";
        s.style.transform = "scale(0)";
        s.style.background = "currentColor";
        s.style.transition = prefersReduced
          ? "none"
          : "transform 450ms ease, opacity 650ms ease";

        el.appendChild(s);

        requestAnimationFrame(() => {
          s.style.transform = "scale(1)";
          s.style.opacity = "0";
        });

        setTimeout(() => s.remove(), 720);
      });
    });
  })();

  // ==============
// Hero subtitle: show all at once (premium reveal)
// ==============
(() => {
  const heroH2 = document.querySelector(".hero h2");
  if (!heroH2) return;

  // Set your exact text, show all at once
  heroH2.textContent =
    "Data Analytics Manager — Datamart design, dashboards, business insights & AI-powered analytics";

  // Add classes for CSS animation
  heroH2.classList.add("hero-subtitle-fx");

  // If reduced motion, keep it static
  if (prefersReduced) {
    heroH2.classList.add("hero-subtitle-fx--static");
    return;
  }

  // Trigger reveal on next frame (so transition runs)
  requestAnimationFrame(() => {
    heroH2.classList.add("is-on");
  });
})();
;

  // ==============
  // Count-up numbers: [data-count]
  // (Optional: you can add some stats later)
  // ==============
  (() => {
    if (prefersReduced) return;

    const nodes = $$("[data-count]");
    if (!nodes.length) return;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animate = (el) => {
      const target = Number(el.getAttribute("data-count"));
      if (!Number.isFinite(target)) return;

      const dur = Number(el.getAttribute("data-count-duration") || 900);
      const start = performance.now();
      const from = Number(String(el.textContent).replace(/[^\d.-]/g, "")) || 0;

      const tick = (now) => {
        const p = clamp((now - start) / dur, 0, 1);
        const v = from + (target - from) * easeOutCubic(p);
        el.textContent = Math.round(v).toString();
        if (p < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animate(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.35 }
    );

    nodes.forEach((el) => io.observe(el));
  })();

  // ==============
  // Smooth anchor scroll (optional)
  // ==============
  (() => {
    if (prefersReduced) return;

    const links = $$('a[href^="#"]').filter((a) => a.getAttribute("href") !== "#");
    if (!links.length) return;

    links.forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        const target = id ? document.querySelector(id) : null;
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.pushState(null, "", id);
      });
    });
  })();
})();

// ==============================
// Demo Gallery: AUTO rotating carousel (infinite loop)
// Targets: .gallery-scroll (your projects grid)
// - Clones items for seamless loop
// - Auto-rotates via requestAnimationFrame
// - Pauses on hover/focus/drag and when tab hidden
// - Keeps 3D rotate visual based on center position
// ==============================
(() => {
  const tracks = Array.from(document.querySelectorAll(".gallery-scroll"));
  if (!tracks.length) return;

  const prefersReduced = Boolean(
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const rafThrottle = (fn) => {
    let raf = 0;
    return (...args) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        fn(...args);
      });
    };
  };

  tracks.forEach((track) => {
    // Wrap so we can safely control layout if needed
    if (!track.parentElement?.classList?.contains("gallery-wrap")) {
      const wrap = document.createElement("div");
      wrap.className = "gallery-wrap";
      track.parentNode.insertBefore(wrap, track);
      wrap.appendChild(track);
    }

    const wrap = track.parentElement;

    // Optional: allow user to set speed via HTML:
    // <div class="projects-grid gallery-scroll" data-auto-speed="45"></div>
    // speed unit: px/sec
    const speedPxPerSec = Number(track.getAttribute("data-auto-speed") || 42); // tweak here

    // Prepare cards list
    const originalCards = Array.from(track.children).filter((el) => el.classList?.contains("card"));
    if (originalCards.length < 2) return;

    // Clone to make seamless loop
    // We clone once (duplicate all cards) => total 2x
    const frag = document.createDocumentFragment();
    originalCards.forEach((c) => frag.appendChild(c.cloneNode(true)));
    track.appendChild(frag);

    const allCards = Array.from(track.children).filter((el) => el.classList?.contains("card"));

    // Compute loop length: width of the original set
    const getGap = () => {
      const cs = getComputedStyle(track);
      const gap = parseFloat(cs.columnGap || cs.gap || "18");
      return Number.isFinite(gap) ? gap : 18;
    };

    const getCardWidth = () => {
      const first = allCards[0];
      return first ? first.getBoundingClientRect().width : 320;
    };

    const getLoopWidth = () => {
      const w = getCardWidth();
      const gap = getGap();
      return originalCards.length * (w + gap);
    };

    // Start near 0
    let loopW = 0;
    const init = () => {
      loopW = getLoopWidth();
      // Ensure we have a valid loop width
      if (loopW <= 0) loopW = 1;
      // Start at 0 (or slightly in to avoid edge-cases)
      track.scrollLeft = 0;
      update3D();
    };

    // Pause controls
    let paused = prefersReduced; // if reduced motion -> pause forever
    let dragging = false;
    let hover = false;
    let focused = false;

    const setPaused = () => {
      paused = prefersReduced || dragging || hover || focused || document.hidden;
    };

    wrap.addEventListener("mouseenter", () => { hover = true; setPaused(); });
    wrap.addEventListener("mouseleave", () => { hover = false; setPaused(); });

    wrap.addEventListener("focusin", () => { focused = true; setPaused(); });
    wrap.addEventListener("focusout", () => { focused = false; setPaused(); });

    document.addEventListener("visibilitychange", () => setPaused());

    // Drag to override (optional, but nice)
    let isDown = false;
    let startX = 0;
    let startLeft = 0;

    const onDown = (e) => {
      isDown = true;
      dragging = true;
      setPaused();
      track.classList.add("dragging");
      startX = e.clientX;
      startLeft = track.scrollLeft;
      track.setPointerCapture?.(e.pointerId);
    };

    const onMove = (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      track.scrollLeft = startLeft - dx;
      update3D();
    };

    const onUp = () => {
      if (!isDown) return;
      isDown = false;
      dragging = false;
      setPaused();
      track.classList.remove("dragging");
    };

    track.addEventListener("pointerdown", onDown, { passive: true });
    track.addEventListener("pointermove", onMove, { passive: true });
    track.addEventListener("pointerup", onUp);
    track.addEventListener("pointercancel", onUp);
    track.addEventListener("pointerleave", onUp);

    // 3D rotate & center highlight
    const update3D = rafThrottle(() => {
      if (prefersReduced) return;

      const r = track.getBoundingClientRect();
      const centerX = r.left + r.width / 2;

      let best = null;
      let bestDist = Infinity;

      allCards.forEach((card) => {
        const cr = card.getBoundingClientRect();
        const cardCenter = cr.left + cr.width / 2;
        const dist = cardCenter - centerX;

        const dir = dist === 0 ? 0 : dist > 0 ? 1 : -1;
        card.style.setProperty("--dir", String(dir));

        const ad = Math.abs(dist);
        if (ad < bestDist) {
          bestDist = ad;
          best = card;
        }
      });

      allCards.forEach((c) => c.classList.toggle("is-center", c === best));
    });

    track.addEventListener("scroll", update3D, { passive: true });
    window.addEventListener("resize", () => {
      init();
    });

    // Infinite loop normalize:
    // Keep scrollLeft in [0, loopW) by wrapping seamlessly
    const normalizeLoop = () => {
      if (loopW <= 1) return;
      if (track.scrollLeft >= loopW) {
        track.scrollLeft -= loopW;
      } else if (track.scrollLeft < 0) {
        track.scrollLeft += loopW;
      }
    };

    // Auto rotate loop
    let lastT = performance.now();
    const tick = (t) => {
      const dt = Math.max(0, (t - lastT) / 1000);
      lastT = t;

      setPaused();

      if (!paused) {
        track.scrollLeft += speedPxPerSec * dt;
        normalizeLoop();
        update3D();
      }

      requestAnimationFrame(tick);
    };

    // Init and start
    init();
    requestAnimationFrame((t) => {
      lastT = t;
      requestAnimationFrame(tick);
    });
  });
})();


