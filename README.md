# Sensei

React + Vite frontend. Isometric SVG scenes, framer-motion animation, Lenis smooth scroll.

```bash
npm install
npm run dev      # local dev server
npm run build    # single-file build in dist/index.html
```

Structure
- `src/lib/model.js`  simulation (300-path Monte Carlo), plan maths, scenarios
- `src/lib/iso.jsx`   isometric engine with tweened geometry and viewBox
- `src/lib/ui.jsx`    Lenis scroll, animated numbers, scroll reveal
- `src/components/`   Boot, Header, Hero, Options, Plan, Hold, BadYear, Tour
