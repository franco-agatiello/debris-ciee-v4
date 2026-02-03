# Data File Instructions

The platform includes sample data files for demonstration purposes. To use your actual debris data:

## Steps to Replace Sample Data

1. Navigate to `public/data/` directory
2. Replace the following CSV files with your actual data:
   - `debris_total.csv`
   - `debris_orbita.csv`
   - `debris_reingresados.csv`
   - `debris_reingresados_con_pos.csv`

## Important Notes

### CSV Delimiter Detection
The platform uses Papaparse which automatically detects delimiters (`,` or `:` or `;`). Your files can use any standard delimiter.

### Required Fields

**debris_total.csv** (for Global Analytics)
- Required: `NORAD_CAT_ID`, `OBJECT_NAME`, `COUNTRY_CODE`, `LAUNCH_DATE`
- Optional: `OBJECT_CLASS`, `MASS`
- Alternative field names: `norad_id`, `nombre`, `pais`, `lanzamiento`, `clase_objeto`, `masa_en_orbita`

**debris_orbita.csv** (for Orbit Monitor 3D)
- Required: `TLE_LINE1`, `TLE_LINE2`, `OBJECT_NAME` (or `nombre`)
- Optional: `NORAD_CAT_ID`, `OBJECT_CLASS`, `MASS`
- Note: Only objects with valid TLE data will be displayed
- Performance: First 3000 objects are rendered for optimal performance

**debris_reingresados.csv** (for Analytics)
- Required: `NORAD_CAT_ID`, `OBJECT_NAME`, `DECAY_DATE`
- Optional: `OBJECT_CLASS`, `COUNTRY_CODE`, `MASS`
- Alternative field names: `norad_id`, `nombre`, `fecha`, `clase_objeto`, `pais`

**debris_reingresados_con_pos.csv** (for Reentry Map 2D)
- Required: `lat_caida`, `lon_caida` (or `lugar_caida.lat`, `lugar_caida.lon`)
- Required: `nombre` or `OBJECT_NAME`
- Optional: `norad_id`, `clase_objeto`, `pais`, `fecha`, `masa_en_orbita`
- Note: Objects without valid coordinates (-90 to 90 lat, -180 to 180 lon) are filtered out

## Field Compatibility

The platform supports both English and Spanish field names:
- `NORAD_CAT_ID` = `norad_id`
- `OBJECT_NAME` = `nombre`
- `COUNTRY_CODE` = `pais`
- `LAUNCH_DATE` = `lanzamiento`
- `OBJECT_CLASS` = `clase_objeto`
- `MASS` = `masa_en_orbita`
- `DECAY_DATE` = `fecha`

## Validation

After replacing files:
1. Open browser console (F12)
2. Check for CSV loading errors
3. Verify data appears in each module
4. Check console for parsing warnings

## Common Issues

1. **No data displayed**: Check CSV file path is correct (`/data/filename.csv` in public folder)
2. **TLE parsing errors**: Ensure TLE_LINE1 and TLE_LINE2 are properly formatted (69-character lines)
3. **Map markers not showing**: Verify latitude/longitude values are valid numbers
4. **Missing objects**: Some may be filtered out if required fields are empty or invalid

## Performance Tips

- For large datasets (>10,000 objects in orbit), consider filtering to LEO objects only
- Reentry map works best with <5,000 points
- Global Analytics can handle large datasets efficiently

## Data Sources

Recommended sources for obtaining real data:
- [Space-Track.org](https://www.space-track.org/) - TLE data, decay information
- [ESA DISCOS](https://discosweb.esoc.esa.int/) - Fragmentation events, reentry data
- [Celestrak](https://celestrak.com/) - Curated TLE datasets

## Privacy & Security

Ensure your CSV files do not contain:
- API keys or credentials
- Internal-only classification data
- Personal information

The platform loads data client-side, so files will be publicly accessible if deployed.
