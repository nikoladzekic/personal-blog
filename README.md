# personal-blog

This is the source for my personal blog, built with [Astro](https://astro.build).

If you've stumbled in here from the live site: hi! There's nothing to install,
nothing to configure, and definitely nothing to "get started" with. This repo
just holds the content and code for the site you were just looking at.

## What's in here

- `src/` – pages, components, and blog content
- `public/` – static assets, plus the `CNAME` file for the custom domain
- `.github/workflows/deploy.yml` – builds and deploys to GitHub Pages on every
  push to `main`

## Deployment

Pushing to `main` triggers a GitHub Actions workflow that builds the site with
`npm run build` and publishes `dist/` to GitHub Pages. The site is served from
a custom domain via the `CNAME` file in `public/`.

That's it. No setup wizard, no contribution guide — just a blog.
