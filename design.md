# Problem Statement
Customer wants to be able to get AI to display some text on the TV

# Implementation
## Design

The page should have one job: render the current text beautifully on a TV.

Visually, I’d use:

* Full viewport: `100vw × 100vh`
* Dark, artsy background
* One centered text block
* Pure white text
* Large sans-serif font
* Strong contrast
* No visible controls
* No branding
* No status indicators
* No navigation
* No cursor/UI chrome if possible in fullscreen

A good default would be something like:

```text
background:
  black / charcoal
  subtle abstract image or CSS texture
  optional dark overlay for readability

text:
  white
  centered vertically + horizontally
  max width ~80vw
  font-size responsive with clamp()
  line-height around 0.95–1.1
  font-weight 700–900
  text-align center
```

For example:

```css
font-size: clamp(3rem, 8vw, 9rem);
max-width: 85vw;
overflow-wrap: anywhere;
```

I would not bake the word `NORTHLAND` into the design. That was just useful as a visual placeholder. The content surface should accept arbitrary text.

The background can either be static or configurable later. For v1, I’d keep it static so WebMCP only has one concept to manipulate: text.

---

# Implementation plan

## 1. Project structure

Use Next.js with static export.

Something approximately like:

```text
/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   └── Display.tsx
├── lib/
│   └── display-state.ts
├── public/
│   └── background.webp
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

Because GitHub Pages is static, I’d configure Next with:

```ts
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true
  }
};
```

If deploying under:

```text
username.github.io/project-name/
```

you may also need:

```ts
basePath: "/project-name",
assetPrefix: "/project-name/",
```

depending on the deployment setup.

---

# 2. Rendering model

The main React component stays extremely simple.

Conceptually:

```tsx
<main className="display">
  <div className="displayText">
    {text}
  </div>
</main>
```

No extra interface elements.

The text should be driven by state:

```ts
const [text, setText] = useState(...)
```

WebMCP becomes the mechanism that calls `setText()`.

---

# 3. WebMCP surface

I’d expose one operation initially:

```text
set_text(text)
```

Semantics:

```json
{
  "text": "Hello world"
}
```

Result:

```json
{
  "success": true
}
```

Behavior:

* Replace all currently displayed text.
* Preserve Unicode.
* Preserve deliberate newline characters.
* Render plain text only.
* Do not interpret incoming text as HTML.

That last point matters.

Never do:

```tsx
dangerouslySetInnerHTML
```

For this project, text should remain text.

I would also strongly consider exposing these later:

```text
get_text()
clear_text()
```

Even if v1 only requires `set_text`, those two operations make debugging and agent interaction significantly nicer.

Possible API surface:

```text
display.set_text
display.get_text
display.clear_text
```

You probably do **not** need separate “edit” and “delete” APIs.

Editing is:

```text
set_text(new value)
```

Deleting is:

```text
clear_text()
```

or:

```text
set_text("")
```

That keeps the protocol extremely small.

---

# 4. Persistence

One important question is what should happen after refresh.

I recommend persisting the last value in `localStorage`.

Flow:

```text
WebMCP set_text
      ↓
React state
      ↓
localStorage
      ↓
render
```

Then on load:

```text
localStorage
      ↓
React state
      ↓
render
```

This gives you an important property for a TV:

**refreshing the browser does not erase the display.**

Example key:

```text
webmcp-display-text
```

No backend required.

---

# 5. TV rendering behavior

I’d target 16:9 first.

Primary resolutions:

```text
1280×720
1920×1080
2560×1440
3840×2160
```

The CSS should nevertheless remain resolution-independent.

Use viewport-relative sizing rather than hard-coded pixels.

Something like:

```css
.displayText {
  width: min(88vw, 1800px);
  font-size: clamp(48px, 8vw, 160px);
  line-height: 0.98;
  text-align: center;
  font-weight: 800;

  overflow-wrap: anywhere;
  word-break: normal;
  white-space: pre-wrap;
}
```

`white-space: pre-wrap` is particularly useful because WebMCP could send:

```text
HELLO
WORLD
```

and the user would actually get two lines.

---

# 6. Overflow strategy

This is one of the more important design decisions.

There are two kinds of overflow.

### Horizontal overflow

Never allow it.

Use:

```css
overflow-wrap: anywhere;
```

For pathological strings such as:

```text
aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

the browser must still break the line.

### Vertical overflow

I would initially allow the page to shrink the text before allowing scrolling.

For instance:

```text
short text
→ huge type

medium text
→ medium type

long text
→ smaller type
```

You can implement this in two ways.

Simplest v1:

```css
font-size: clamp(...)
```

More polished v2:

Measure the text container with `ResizeObserver` and reduce a CSS variable until it fits.

For TV usage, I would avoid vertical scrolling entirely.

If text exceeds a reasonable amount, the display should continue reducing font size down to a floor such as:

```text
32px
```

After that, either:

* clip,
* scroll,
* or reject excessively large input.

I recommend **clip nowhere and scroll nowhere**.

Instead cap input length, perhaps:

```text
2,000 characters
```

and let the font shrink down to a sensible minimum.

---

# 7. Background implementation

Given the visual direction you showed, I’d keep the background art independent of the text.

Something like:

```tsx
<div className="background" />
<div className="overlay" />
<div className="text">...</div>
```

The background might be:

* a static abstract image,
* a very dark editorial photograph,
* generative CSS gradients,
* or a WebP artwork.

I’d probably choose a static image for v1 because it gives you precise visual control.

Then:

```css
background:
  linear-gradient(rgba(0,0,0,.35), rgba(0,0,0,.55)),
  url("/background.webp");

background-size: cover;
background-position: center;
```

This lets the typography stay consistently readable.

---

# GitHub Pages deployment

I’d use GitHub Actions.

Flow:

```text
push to main
    ↓
npm ci
    ↓
npm run build
    ↓
Next static export
    ↓
deploy /out to GitHub Pages
```

The generated site should have no server dependency.

One deployment gotcha worth testing early:

```text
basePath
```

GitHub project pages frequently break static asset URLs if this is configured incorrectly.

I would make deployment part of the first milestone rather than something done at the end.

---

# Test plan

You already have the right categories. I’d formalize them slightly.

## Manual functional tests

Test these actions:

| Test             | Expected                        |
| ---------------- | ------------------------------- |
| Initial load     | Display renders                 |
| Set text         | New text appears                |
| Set second text  | Old text fully replaced         |
| Empty text       | Screen contains background only |
| Refresh          | Last text remains               |
| Unicode          | Characters render correctly     |
| Emoji            | Renders without breaking layout |
| Explicit newline | New line preserved              |
| Spaces           | Normal text layout remains sane |
| Reload TV        | Display restores correctly      |

Also test strings like:

```text
HELLO
```

```text
Hello from WebMCP
```

```text
THIS IS A MUCH LONGER MESSAGE THAT SHOULD WRAP ONTO MULTIPLE LINES
```

```text
第一行
第二行
```

and:

```text
averyveryveryveryveryveryveryveryverylongword
```

---

# Resolution tests

At minimum:

```text
1280 × 720
1920 × 1080
2560 × 1440
3840 × 2160
```

Also test common browser/window oddities:

```text
1366 × 768
1440 × 900
1024 × 768
```

The site does not need to look ideal on 4:3, but it should not break.

For each resolution verify:

* no horizontal scrollbar
* no vertical scrollbar
* text remains visible
* text remains centered
* background fills viewport
* no unexpected clipping
* font remains readable

---

# Text-size matrix

I’d specifically test different content lengths.

### 1–10 characters

```text
HELLO
```

Expected:
Very large type.

### 20–50 characters

```text
WELCOME TO THE STUDIO
```

Expected:
Large type, probably one or two lines.

### 100–250 characters

Expected:
Several balanced lines.

### 500 characters

Expected:
Still entirely visible.

### 1,000+ characters

Expected:
Graceful size reduction.

This should probably become a reusable fixture set.

---

# Line-wrapping tests

You specifically mentioned “text overflow next line.”

I would test:

```text
normal words
```

```text
a single enormous word
```

```text
URLs
```

```text
hyphenated-words
```

```text
numbers
```

```text
manual
line
breaks
```

```text
emoji 🚀🚀🚀🚀🚀
```

Expected behavior:

```text
never extend beyond viewport
never cause horizontal scrolling
preserve intentional newlines
```

---

# Visual regression testing

This is the one thing I would add to your plan.

Use Playwright screenshots.

For example:

```text
tests/
  display.spec.ts
  fixtures.ts
```

Then capture:

```text
1920x1080-short.png
1920x1080-medium.png
1920x1080-long.png
3840x2160-short.png
3840x2160-long.png
```

That makes it very easy to catch:

* font changes
* padding changes
* text unexpectedly becoming tiny
* background positioning changes
* Next/Tailwind changes affecting layout

For something whose entire purpose is visual output, screenshot testing is unusually valuable.

---

# Browser testing

Since this is being cast to a TV, I would test:

* Chrome desktop
* Edge
* Safari if Mac is involved
* Chrome casting to the television
* native television browser if you intend to use one

Casting is worth testing separately because the rendering viewport can behave differently from your laptop viewport.

---

# Fullscreen behavior

I would also test:

```text
browser normal
browser fullscreen
cast tab
cast screen
```

The display should use:

```css
min-height: 100dvh;
```

rather than only:

```css
100vh
```

where appropriate, because browser UI can affect viewport calculations.

---

# Accessibility / robustness

Even though the screen is simple:

```html
<main>
  <div aria-live="polite">
      ...
  </div>
</main>
```

could be useful.

But I would not overdo accessibility semantics for what is essentially a passive display.

More important:

* high contrast
* no flashing
* no motion required
* reduced-motion support if you later animate
* readable from several meters away

---

# Security

Because WebMCP is changing displayed content:

* treat input as plain text
* never execute HTML
* never execute Markdown
* never inject scripts
* enforce max text length
* validate argument is a string

For example:

```ts
if (typeof text !== "string") {
  throw new Error("text must be a string");
}

if (text.length > 2000) {
  throw new Error("text exceeds maximum length");
}
```

That is probably sufficient for this version.

---

# Suggested v1 scope

I would keep the first version deliberately tiny:

```text
Static Next.js site
Dark artistic background
One centered white text block
Responsive typography
WebMCP set_text
localStorage persistence
GitHub Pages deployment
Playwright screenshot tests
```

Nothing else.

No control panel.

No visible editor.

No login.

No database.

No animation.

No formatting controls.

No markdown.

No theme picker.

The simplicity is actually what makes this idea good for WebMCP: the agent gets an extremely constrained surface with a very predictable result.

## Acceptance criteria

I’d call v1 done when all of these are true:

1. Opening the GitHub Pages URL shows a clean full-screen composition.
2. Calling `set_text("HELLO")` changes the screen immediately.
3. Refreshing retains `HELLO`.
4. Text never causes horizontal overflow.
5. Manual line breaks work.
6. 720p, 1080p, 1440p, and 4K all render correctly.
7. Long content stays inside the display area.
8. There are zero visible application controls.
9. Content remains readable when cast to the TV.
10. Static deployment works without any server process.

**very long text should automatically shrink to fit**. 