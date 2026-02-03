# Quick Start Guide

Get up and running with CIEE Space Watch Suite in 5 minutes.

## Step 1: Install Dependencies

```bash
cd space-watch-suite
npm install
```

Wait for ~30 seconds while dependencies download.

## Step 2: Start Development Server

```bash
npm run dev
```

You should see:
```
  VITE v7.3.1  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

## Step 3: Open in Browser

Visit: **http://localhost:5173**

You should see the CIEE Space Watch Suite with a dark space-themed interface.

## Step 4: Explore the Modules

### Module A: Global Analytics (Default)
- View 4 KPI cards with statistics
- Explore pie chart (orbit vs decay)
- Check bar chart (top polluters)
- Scroll to see launch timeline

### Module B: Reentry Map 2D
- Click "Reentry Map 2D" in sidebar
- Wait for map to load (CartoDB tiles)
- Click markers to see details
- Try toggling "Heatmap" button
- Use "Class" filter dropdown

### Module C: Orbit Monitor 3D
- Click "Orbit Monitor 3D" in sidebar
- Wait for globe to load (~5 seconds)
- Watch satellites orbit in real-time
- Click any satellite for details
- Drag to rotate globe

### Module D: Risk & Collision
- Click "Risk & Collision" in sidebar
- View coming soon page
- Check development timeline
- Explore planned features

## Step 5: Add Your Own Data (Optional)

Replace sample CSV files in `public/data/`:

1. **debris_total.csv** - Your master catalog
2. **debris_orbita.csv** - Active satellites with TLEs
3. **debris_reingresados.csv** - Reentry history
4. **debris_reingresados_con_pos.csv** - Reentries with coordinates

Format requirements in `DATA_INSTRUCTIONS.md`.

After replacing files, refresh browser (Ctrl+R or Cmd+R).

## Troubleshooting

### "Cannot find module" error
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 5173 already in use
```bash
npm run dev -- --port 3000
```

### CSV files not loading
1. Check browser console (F12)
2. Verify files are in `public/data/`
3. Ensure valid CSV format

### 3D Globe not rendering
- Check WebGL support: visit https://get.webgl.org/
- Try different browser (Chrome recommended)
- Update graphics drivers

### Map tiles not loading
- Check internet connection
- Verify CartoDB CDN is accessible
- Wait 10 seconds and refresh

## Building for Production

```bash
npm run build
```

Output will be in `dist/` folder.

Preview production build:
```bash
npm run preview
```

## Next Steps

- Read `README.md` for comprehensive docs
- Check `DEPLOYMENT.md` for hosting options
- Review `DATA_INSTRUCTIONS.md` for CSV formats
- See `PROJECT_STRUCTURE.md` for architecture

## Getting Help

1. Check browser console for errors (F12)
2. Review documentation files
3. Visit CIEE website: https://www.ciee.unlp.edu.ar/
4. Open GitHub issue (if applicable)

## Keyboard Shortcuts

- **Sidebar Navigation**: Click module links
- **Collapse Sidebar**: Click arrow button
- **Globe Rotation**: Click + drag
- **Map Zoom**: Scroll wheel or +/- buttons
- **Popup Close**: Click X or press Escape

## Pro Tips

1. **Performance**: Close other browser tabs for smoother 3D
2. **Data Loading**: Keep CSV files under 10MB for fast loading
3. **Mobile**: Best experience on desktop, but works on tablets
4. **Console**: Keep F12 console open to see loading progress
5. **Refresh**: Ctrl+Shift+R for hard refresh if data changes

## Sample Data Included

The app ships with sample data:
- 6 objects in total catalog
- 3 active satellites in orbit
- 4 reentered objects
- 6 reentries with locations

This is enough to test all features. Replace with real data for production.

## System Requirements

**Minimum**:
- Node.js 18+
- 4GB RAM
- Modern browser (2020+)
- Internet connection (for tiles/CDN)

**Recommended**:
- Node.js 20+
- 8GB RAM
- Chrome 100+ or Firefox 100+
- Dedicated GPU (for 3D module)

## Need More Help?

See comprehensive guides:
- Architecture: `PROJECT_STRUCTURE.md`
- Implementation: `IMPLEMENTATION_SUMMARY.md`
- Deployment: `DEPLOYMENT.md`
- Data Format: `DATA_INSTRUCTIONS.md`

**Happy space tracking! 🛰️**
