# Vercel Deployment Guide

This project is configured for deployment on Vercel to enable Web Analytics.

## Prerequisites

- A Vercel account (sign up at https://vercel.com)
- Vercel CLI (optional): `npm i -g vercel`

## Deployment Options

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/new
2. Import this Git repository
3. Vercel will automatically detect the static HTML configuration
4. Click "Deploy"

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Deploy to production
vercel --prod
```

## Enabling Web Analytics

After your first deployment:

1. Go to your project dashboard on Vercel
2. Navigate to the "Analytics" tab
3. Click "Enable Web Analytics"
4. The analytics will start collecting data on your next deployment

## How It Works

The project already includes the Vercel Web Analytics script in `index.html`:

```html
<!-- Vercel Web Analytics -->
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
```

When deployed on Vercel, the `/_vercel/insights/script.js` endpoint becomes available and starts tracking:
- Page views
- Unique visitors
- Top pages
- Top referrers
- And more...

## Viewing Analytics Data

Once enabled and deployed:

1. Visit your Vercel project dashboard
2. Click on the "Analytics" tab
3. After a few visitors, you'll see real-time analytics data

## Configuration Files

- `vercel.json` - Vercel project configuration for static HTML site
- `.vercelignore` - Files to exclude from Vercel deployment

## Note on GitHub Pages

This project was previously deployed to GitHub Pages. While the GitHub Pages deployment will continue to work via the existing GitHub Actions workflow, the Vercel Analytics will only function when the site is deployed on Vercel.

You can maintain both deployments:
- **Vercel deployment**: For production with analytics
- **GitHub Pages deployment**: For testing or alternative hosting

## Support

For more information about Vercel Web Analytics:
- [Vercel Analytics Documentation](https://vercel.com/docs/analytics)
- [Vercel Analytics Quickstart](https://vercel.com/docs/analytics/quickstart)
