# SEO Pages Configuration

This document explains how to set up the SEO頁面 (SEO Pages) sheet tab in Google Sheets to generate SEO-optimized landing pages.

## Sheet Structure

Create a new sheet tab named exactly: `SEO頁面`

### Columns

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | Slug | URL path for the page (no leading slash) | `korean-artists` |
| B | Title (EN) | English page title | `Korean Artists Donations for Tai Po Fire` |
| C | Title (ZH) | Chinese page title | `韓國藝人大埔火災捐款` |
| D | Description (EN) | English meta description | `Complete list of donations from Korean celebrities...` |
| E | Description (ZH) | Chinese meta description | `韓國藝人為大埔火災的所有捐款...` |
| F | Filter Config | JSON object with filter/sort rules | `{"capital": "韓國", "type": "藝人", "sort": "value-desc"}` |

## Filter Config Options

The Filter Config column accepts a JSON object with these properties:

```json
{
  "capital": "韓國",        // Filter by Capital (Country)
  "industry": "金融",       // Filter by Industry
  "type": "企業",           // Filter by Type
  "group": "韓國藝人",      // Filter by Group (legacy)
  "sort": "value-desc",    // Sort order: "value-desc", "value-asc", "entity-asc", "date-desc"
  "limit": 50              // Limit number of results
}
```

## Example Rows

| Slug | Title (EN) | Title (ZH) | Description (EN) | Description (ZH) | Filter Config |
|------|-----------|-----------|------------------|------------------|---------------|
| `korean-artists` | Korean Artists Donations | 韓國藝人捐款 | All donations from Korean celebrities for the Tai Po Wang Fuk Court fire relief | 韓國藝人為大埔宏福苑火災的所有捐款 | `{"capital": "韓國", "type": "藝人", "sort": "value-desc"}` |
| `chinese-companies` | Chinese Companies Donations | 中資企業捐款 | Complete list of donations from Chinese companies | 中資企業為大埔火災的所有捐款 | `{"capital": "中國", "type": "企業", "sort": "value-desc"}` |
| `crypto-donations` | Cryptocurrency Industry Donations | 加密貨幣業界捐款 | All donations from the cryptocurrency industry | 加密貨幣業界的所有捐款 | `{"industry": "加密貨幣", "sort": "value-desc"}` |
| `top-50` | Top 50 Largest Donations | 五十大捐款 | The 50 largest donations for Tai Po fire relief | 大埔火災最大的50筆捐款 | `{"sort": "value-desc", "limit": 50}` |
| `hk-charities` | Hong Kong Charity Organizations | 香港慈善機構捐款 | Donations from Hong Kong charitable organizations | 香港慈善機構的捐款 | `{"capital": "香港", "industry": "慈善", "sort": "value-desc"}` |

## Generated URLs

The build script generates pages at:
- `/korean-artists/index.html` → accessible at `yoursite.com/korean-artists/`
- `/chinese-companies/index.html` → accessible at `yoursite.com/chinese-companies/`
- etc.

## Best Practices for SEO

1. **Slug**: Use lowercase, hyphen-separated keywords
2. **Title**: Include target keywords, keep under 60 characters
3. **Description**: Write compelling summary, include keywords, 150-160 characters
4. **Filter**: Create pages that answer specific search queries like:
   - "How much did Korean artists donate to Tai Po fire?"
   - "Chinese company donations Tai Po fire"
   - "Top donations Tai Po Wang Fuk Court fire"

