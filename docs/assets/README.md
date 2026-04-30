# docs/assets/

Static assets referenced by README, docs site, and the launch announcement.

## What's here (PR 1 of initiative 0002)

| Asset      | Purpose                                                     | Status                                      |
| ---------- | ----------------------------------------------------------- | ------------------------------------------- |
| `hero.svg` | Terminal-style mockup of the 30-minute clone-to-deploy flow | placeholder — real recording lands in PR 10 |

## What's coming

| Asset       | Purpose                                                                                                                | Lands in |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| `demo.cast` | Asciinema recording of a real founder run (`bun create gaia-app@latest` → `bun gaia verify-keys` → `deploy` → `smoke`) | PR 10    |
| `og.png`    | Open Graph social-preview card (1200×630 PNG, GitHub social-preview spec)                                              | PR 10    |
| `demo.tape` | [vhs.charm.sh](https://github.com/charmbracelet/vhs) script that regenerates `demo.gif` from a tape                    | PR 10    |

## Conventions

- SVGs are inline-renderable (no external fonts). Use system monospace stacks (`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`).
- Raster images use a `1280×640` aspect for hero placement and `1200×630` for Open Graph.
- Recordings cap at 60 seconds. The README displays them above the fold.
