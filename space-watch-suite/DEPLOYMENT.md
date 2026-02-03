# Deployment Guide

## Local Development

```bash
cd space-watch-suite
npm install
npm run dev
```

Access at: http://localhost:5173

## Production Build

```bash
npm run build
npm run preview
```

The `dist/` folder contains the production-ready build.

## Deployment Options

### 1. Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repo to Vercel dashboard.

**Configuration:**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### 2. Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Configuration:**
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 18+

### 3. GitHub Pages

1. Install gh-pages:
```bash
npm install -D gh-pages
```

2. Add to `package.json`:
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. Update `vite.config.js`:
```js
export default {
  base: '/your-repo-name/'
}
```

4. Deploy:
```bash
npm run deploy
```

### 4. Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:
```bash
docker build -t space-watch-suite .
docker run -p 8080:80 space-watch-suite
```

### 5. AWS S3 + CloudFront

1. Build the project:
```bash
npm run build
```

2. Upload `dist/` folder to S3 bucket
3. Enable static website hosting
4. Configure CloudFront distribution
5. Set index.html as default root object

## Environment Variables

If using Supabase integration:

1. Create `.env` file:
```env
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

2. Configure in deployment platform:
   - Vercel: Settings → Environment Variables
   - Netlify: Site settings → Environment Variables
   - GitHub Pages: Use GitHub Secrets

## Post-Deployment Checklist

- [ ] Verify all modules load correctly
- [ ] Test CSV data loading
- [ ] Check browser console for errors
- [ ] Test on mobile devices
- [ ] Verify 3D globe renders properly
- [ ] Test map interactions
- [ ] Check analytics charts display correctly

## Performance Optimization

For production, consider:

1. **Code Splitting**: Already configured via Vite
2. **Image Optimization**: Compress any custom images
3. **CDN**: Use CloudFront or similar for global distribution
4. **Caching**: Configure appropriate cache headers
5. **Compression**: Enable gzip/brotli on server

## Monitoring

Recommended tools:
- Google Analytics (add to index.html)
- Sentry for error tracking
- LogRocket for session replay
- Lighthouse for performance audits

## Security Considerations

- Ensure CSV files don't contain sensitive data
- Use HTTPS in production
- Configure CORS if using external APIs
- Implement rate limiting if adding backend features

## Troubleshooting

**Build fails:**
- Check Node version (18+ required)
- Clear node_modules and reinstall
- Check for port conflicts

**Data not loading:**
- Verify CSV files are in `public/data/`
- Check browser console for CORS errors
- Ensure file paths are correct

**3D Globe not rendering:**
- Check WebGL support in browser
- Verify three.js dependencies loaded
- Check for JavaScript errors in console

## Support

For issues or questions:
- Check GitHub Issues
- Contact CIEE: https://www.ciee.unlp.edu.ar/
- Review documentation in README.md
