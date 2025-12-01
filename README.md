# Tai Po Fire Donations Watcher

> 大埔火災捐款追蹤 | Tracking donations for the Wang Fuk Court fire relief

[![Build and Deploy](https://github.com/Taipo-Big-Donations-Watcher/Taipo-Big-Donations-Watcher.github.io/actions/workflows/build-deploy.yml/badge.svg)](https://github.com/Taipo-Big-Donations-Watcher/Taipo-Big-Donations-Watcher.github.io/actions/workflows/build-deploy.yml)

A bilingual (English/Chinese) static website that tracks and displays donations for the Tai Po Wang Fuk Court fire disaster relief. Built with SEO in mind, using Google Sheets as the data backend.

## 🌐 Live Site

- **English**: [https://taipo-big-donations-watcher.github.io/en/](https://taipo-big-donations-watcher.github.io/en/)
- **中文**: [https://taipo-big-donations-watcher.github.io/zh/](https://taipo-big-donations-watcher.github.io/zh/)

## ✨ Features

- **Bilingual Support**: Full English and Chinese translations
- **SEO Optimized**: Pre-rendered pages for specific search queries
- **Real-time Data**: Syncs with Google Sheets every 6 hours
- **GitHub Pages**: Free hosting with automatic deployment
- **No Backend Required**: 100% static site, all filtering done client-side

## 📊 Data Source

Data is sourced from a Google Sheet containing:
- **275+ donations** tracked
- **HKD 2.65+ billion** in total pledges
- Categories: Capital (Country), Industry, Type
- Source links for verification

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  GitHub Actions (Every 6 hours)             │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐ │
│  │ Google      │───▶│ Build Script │───▶│ Static HTML/JS │ │
│  │ Sheets API  │    │ (Node.js)    │    │ GitHub Pages   │ │
│  └─────────────┘    └──────────────┘    └────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Google Cloud service account with Sheets API access

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Taipo-Big-Donations-Watcher/Taipo-Big-Donations-Watcher.github.io.git
   cd Taipo-Big-Donations-Watcher.github.io
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env.local`** with your credentials:
   ```
   GOOGLE_SHEET_ID="your-sheet-id"
   GOOGLE_SERVICE_ACCOUNT=`{"type": "service_account", ...}`
   ```

4. **Build the site**
   ```bash
   npm run build
   ```

5. **Preview locally**
   ```bash
   open dist/en/index.html
   # or
   npx serve dist
   ```

## 📁 Project Structure

```
├── .github/workflows/
│   └── build-deploy.yml    # GitHub Actions workflow
├── dist/                   # Build output (generated)
│   ├── index.html          # Language redirect
│   ├── en/                 # English pages
│   ├── zh/                 # Chinese pages
│   └── data.json           # JSON API
├── docs/
│   └── seo-pages-setup.md  # SEO pages configuration guide
├── src/
│   ├── i18n/
│   │   ├── en.json         # English translations
│   │   ├── zh.json         # Chinese translations
│   │   └── categories.js   # Category translations
│   ├── data-processor.js   # Data transformation
│   └── sheets-api.js       # Google Sheets API
├── build.js                # Main build script
├── template.html           # HTML template
└── package.json
```

## ⚙️ GitHub Actions Setup

### 1. Add Repository Secrets

Go to **Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Value |
|-------------|-------|
| `GOOGLE_SHEET_ID` | Your Google Sheet ID |
| `GOOGLE_SERVICE_ACCOUNT` | Full JSON of service account credentials |

### 2. Enable GitHub Pages

Go to **Settings → Pages**:
- Source: **GitHub Actions**

### 3. Build Schedule

The workflow runs:
- On every push to `main`
- Every 6 hours (cron: `0 */6 * * *`)
- Manually via "Run workflow" button

## 📝 Adding SEO Pages

Create a new sheet tab named `SEO頁面` with these columns:

| Column | Description | Example |
|--------|-------------|---------|
| Slug | URL path | `korean-artists` |
| Title (EN) | English title | `Korean Artists Donations` |
| Title (ZH) | Chinese title | `韓國藝人捐款` |
| Description (EN) | Meta description | `All donations from Korean celebrities...` |
| Description (ZH) | 中文描述 | `韓國藝人的所有捐款...` |
| Filter Config | JSON filter rules | `{"capital": "韓國", "sort": "value-desc"}` |

See [docs/seo-pages-setup.md](docs/seo-pages-setup.md) for detailed instructions.

## 🌍 Adding English Entity Names

To show English names for entities:

1. Add a column **"Entity (EN)"** to your Google Sheet
2. Fill in English names where applicable
3. The build will automatically use them in the English version

## 🛠️ Available Scripts

```bash
npm run build          # Build static site → dist/
npm run fetch          # Debug: fetch & display sheet data
npm run generate-columns  # Generate Capital/Industry/Type suggestions
```

## 📄 License

[GPL-3.0](LICENSE)

## 🙏 Acknowledgments

- Data compiled from public announcements
- Built in response to the Wang Fuk Court fire tragedy (November 26, 2025)

---

<p align="center">
  <strong>🕯️ In memory of the victims of the Wang Fuk Court fire</strong>
</p>

