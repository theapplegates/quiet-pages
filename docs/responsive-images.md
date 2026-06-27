# Responsive images with Cloudinary (JXL/AVIF/WebP)

Images are uploaded to Cloudinary once. Cloudinary computes responsive
breakpoints and transcodes to JXL/AVIF/WebP on its CDN. The site only generates
URLs. Sharp is never involved, and the repo ships zero image bytes.

This theme uses Astro 6.4.4 on Node >= 22.13.0.

---

## How it works (two halves)

- **One time, per image (manual):** run the breakpoints script. It uploads the
  image to Cloudinary, Cloudinary returns the responsive widths, and the script
  writes them to `src/data/cloudinary-breakpoints.json`.
- **Every build/page view (automatic):** `src/components/Picture.astro` reads
  the JSON and emits a `<picture>` with `image/jxl`, `image/avif`, and
  `image/webp` sources, plus a WebP `<img>` as the floor.

Nothing watches `src/assets/`. Adding an image does nothing until you run the
script.

---

## The 4 files

| Path | Role |
|---|---|
| `src/components/Picture.astro` | Renders the `<picture>`; builds `f_jxl`/`f_avif`/`f_webp` Cloudinary URLs. |
| `scripts/cloudinary-breakpoints.mjs` | Uploads (or runs on an existing public ID) and writes widths to the JSON. |
| `src/data/cloudinary-breakpoints.json` | Generated. Start as `{}`. Never hand-edit. |
| The call site in a `.mdx` post | Where you actually use `<Picture>`. |

---

## Prerequisites (already set up in this theme)

- MDX enabled via `@astrojs/mdx`.
- `@/*` -> `src/*` path alias in `tsconfig.json` (and in `vite.resolve.alias`).
- Node >= 22.13.0; the script uses `--env-file=.env`.
- `.env` is gitignored. It contains:
  ```
  PUBLIC_CLOUDINARY_CLOUD_NAME="<your-cloud>"
  CLOUDINARY_CLOUD_NAME="<your-cloud>"
  CLOUDINARY_API_KEY="..."
  CLOUDINARY_API_SECRET="..."
  ```
  `PUBLIC_*` is what `astro-cloudinary` reads at build time; the unprefixed
  trio is what the upload script needs.

---

## Critical: rehype-sanitize must stay out of the Astro markdown config

This is the one thing that silently breaks the pipeline.

`astro.config.mjs` must NOT list `rehype-sanitize` in `markdown.rehypePlugins`.
`hast-util-sanitize` (the engine under `rehype-sanitize`) drops every node type
it does not recognize, which includes MDX component elements
(`mdxJsxFlowElement`). The result: any imported component used inside a `.mdx`
post — including `<Picture />` — is deleted with no error and no output.

If you ever need to sanitize untrusted content, run it through a separate
`unified` pipeline (`remark-parse` -> `remark-rehype` -> `rehype-sanitize` ->
`rehype-stringify`) before it reaches MDX. Do not put `rehype-sanitize` in the
Astro markdown config.

The current config keeps `rehypeRaw`, `remark-directive`, and shiki in the
markdown pipeline, and intentionally omits `rehype-sanitize`.

---

## Adding a new responsive image

1. Drop the file into `src/assets/images/` (for example
   `src/assets/images/david-test.jpg`).

2. Generate breakpoints (uploads to Cloudinary and writes widths to the JSON):
   ```
   npm run cloudinary:breakpoints -- src/assets/images/david-test.jpg
   ```
   The public ID is derived from the path:
   `src/assets/images/david-test.jpg` -> `assets/images/david-test`.

3. Use it in a `.mdx` post with this form:
   ```mdx
   import Picture from "@/components/Picture.astro";
   import breakpoints from "@/data/cloudinary-breakpoints.json";

   <Picture
     src="assets/images/david-test"
     alt="Describe the image accurately."
     width={4032}
     height={3024}
     sizes="(min-width: 768px) 720px, 100vw"
     breakpoints={breakpoints["assets/images/david-test"]}
     pictureClass="responsive-picture"
   />
   ```

### Reusing an image already in Cloudinary

No local file needed — pass the public ID directly:
```
npm run cloudinary:breakpoints -- assets/images/david-test
```
Then use the same `<Picture>` call site with `src="assets/images/david-test"`.

---

## Important details

- **Ignore the snippet the script prints.** `cloudinary-breakpoints.mjs` prints
  a `<cloudinary-picture ... breakpoints="200, 756, ..." picture-class="..."/>`
  block. That is the remark-directive + comma-string form. It does not work on
  this site: it passes a string instead of the array the component expects,
  and there is no directive handler mapped to the component. Use the
  component-import form above with `breakpoints={breakpoints[...]}` (an array).

- **Use the real intrinsic `width` and `height`** (for example `4032` x
  `3024`), not the max breakpoint. The component appends the intrinsic width to
  the srcset, and `crop: "limit"` means Cloudinary never upscales beyond the
  original. A high-DPI screen gets the full-res file, while the `width`/`height`
  attributes keep the aspect-ratio box for zero layout shift.

- **`.md` vs `.mdx`.** This theme's content collection only loads `**/index.mdx`,
  so use `.mdx`. Plain `.md` cannot import components or use JSX, so the
  component-import form does not work there. If you ever need images in `.md`
  posts, either render the image from the layout/page using frontmatter, or add
  a remark plugin that maps a `::cloudinary-picture` directive to `<Picture>`
  with breakpoints passed as a string. Neither is set up here.

- **`alt` is required.** `<Picture>` throws if `alt` is empty. Replace any
  placeholder alt text with an accurate description before publishing.

---

## Verifying

Build, then check the output:
```
npm run build
```
The rendered post HTML should contain one `<picture class="responsive-picture">`
with three `<source>` elements in order — `image/jxl`, `image/avif`,
`image/webp` — a srcset matching the generated widths plus the intrinsic width,
and a WebP `<img>` floor with `alt`, `width`, `height`, `sizes`, `loading`, and
`decoding`.

In the browser Network tab filtered to `res.cloudinary.com`: Safari requests
`f_jxl`; Chrome picks `f_avif` unless its JXL flag is on. That is the browser's
choice, not a bug.

For local preview:
```
npm run dev
```
Open the post and inspect the image element.

---

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| No `<picture>` in output, no error | `rehype-sanitize` is in `markdown.rehypePlugins` and is stripping the MDX component | Remove `rehype-sanitize` from the Astro markdown config (see above) |
| `Cloudinary breakpoints are missing...` thrown by `<Picture>` | The script was not run for that public ID, or the `src` does not match the JSON key | Run `npm run cloudinary:breakpoints -- <file-or-id>`; the `src` prop must match the JSON key exactly |
| `Missing Cloudinary credentials` | `.env` not present or incomplete | Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` to `.env` |
| `<cloudinary-picture ...>` renders nothing | Using the directive/string form the script prints | Use the component-import + array form shown above |
| ERESOLVE on `npm install` | `astro-cloudinary` peer dep vs Astro 6 | `npm install --legacy-peer-deps` (`.npmrc` already has `legacy-peer-deps=true`) |

---

## Notes

- `src/data/cloudinary-breakpoints.json` is generated. Never hand-edit it.
- `.env` is gitignored. If it is already tracked in git, untrack it with
  `git rm --cached .env` and rotate any committed Cloudinary secrets.
- The `.responsive-picture` class is styled in `src/styles.css` (block,
  full-width, `height: auto`, reduced-motion-safe).
- [ ] 