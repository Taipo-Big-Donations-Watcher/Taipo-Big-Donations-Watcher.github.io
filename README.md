# 大埔火災捐款追蹤器 | Tai Po Fire Donations Watcher

> [!IMPORTANT]
> **Live Site / 網站**: https://taipo-big-donations-watcher.github.io/

![Build Status](https://github.com/Taipo-Big-Donations-Watcher/Taipo-Big-Donations-Watcher.github.io/actions/workflows/build-deploy.yml/badge.svg)
![License](https://img.shields.io/github/license/Taipo-Big-Donations-Watcher/Taipo-Big-Donations-Watcher.github.io)

本項目旨在追蹤及整合各界就 2025 年 11 月 26 日大埔宏福苑火災的承諾捐款，建立一個公開、集中及可查證的資料庫。

This project aims to track and consolidate pledged donations from various sectors regarding the Tai Po Wang Fuk Court fire on November 26, 2025, establishing a transparent, centralized, and verifiable database.

## 目錄 (Table of Contents)

- [一、目的 (Purpose)](#一目的-purpose)
- [二、背景 (Background)](#二背景-background)
- [三、網站功能 (Features)](#三網站功能-features)
- [四、數據來源 (Data Source)](#四數據來源-data-source)
- [五、技術架構 (Technical Architecture)](#五技術架構-technical-architecture)
- [English Version](#english-version)

---

## 一、目的 (Purpose)

建立此追蹤器的主要目的如下：

1.  **資訊透明 (Clarity)**
    坊間有大量關於「誰捐了多少」的零散報導，但缺乏一個能一覽所有公開捐款的單一平台。本網站致力於整合這些資訊，提供清晰的數據概覽。

2.  **鼓勵捐助 (Encouragement)**
    通過展示來自不同國家、行業及界別的捐款，我們希望產生正面影響，鼓勵更多團體、企業及個人參與支援行動。

3.  **公眾監察 (Watchdog)**
    紀錄不僅是為了讚賞，更是為了監察。我們將持續追蹤這些「承諾」的資金是否、以及如何轉移到受影響的居民手中，確保善款落實到位。

4.  **悼念與反思 (Memorial)**
    我們希望藉此紀錄逝去的生命。必須強調的是，無論捐款數字多大，都無法挽回失去的生命，甚至難以完全彌補居民及業主的財產損失。這些數字背後，是無法用金錢衡量的沉重代價。

## 二、背景 (Background)

2025 年 11 月 26 日，香港新界大埔區宏福苑發生嚴重火災。火勢迅速蔓延，造成災難性後果。

- **傷亡情況**：至少 156 人死亡，79 人受傷，其中包括一名殉職的消防員。
- **影響範圍**：大量居民失去家園，財產損失慘重。
- **社會反應**：各界機構、跨國企業、各國藝人及個人紛紛承諾捐款或提供物資支援。

本網站嘗試追蹤所有價值超過港幣 10 萬元的公開捐款及物資承諾。

## 三、網站功能 (Features)

- **雙語支援**：完整的中英文介面 (English/中文)。
- **實時篩選**：
    - 按 **捐款類型** (現金 / 物資)
    - 按 **資金來源地** (如：香港、中國、美國、韓國等)
    - 按 **行業** (如：金融、演藝、科技等)
    - 按 **機構類型** (企業、個人、機構等)
- **智能排序**：根據篩選條件自動調整金額排序。
- **動態摘要**：即時生成數據統計摘要。
- **來源驗證**：每一筆記錄均附有新聞或官方公佈的來源連結，部分已核實款項附有驗證標記。

## 四、數據來源 (Data Source)

所有數據均源自公開的新聞報導、官方新聞稿及機構聲明。
數據庫存放於 Google Sheets，每 6 小時自動同步至網站。

- **查看原始數據**: [Google Sheets](https://docs.google.com/spreadsheets/d/1dg6LxT5JElZZ5-owLMlD6uIFMsLpTfPU2cYCk5j79TI/edit?usp=sharing)
- **提交更正**: 
    - 直接在 Google Sheets 上留言
    - 透過頁腳的連結聯絡我們
    - 在此 GitHub Repo [提交 Issue](https://github.com/Taipo-Big-Donations-Watcher/Taipo-Big-Donations-Watcher.github.io/issues)

---

<a id="english-version"></a>

# English Version

## 1. Purpose

The primary objectives of this tracker are:

1.  **Clarity**
    While there are many reports on who donated how much, there is no single place to view all public donations. We aim to provide a centralized source of truth.

2.  **Encouragement**
    By visualizing contributions from different groups, we hope to encourage more donations from various sectors and individuals.

3.  **Corporate Watchdog**
    We act as a watchdog to track not just the pledges, but how and when these funds are transferred to the people in need.

4.  **Memorial**
    To memorialize the lives lost. It is crucial to highlight that no amount of donations can bring back lost lives, nor can it fully cover the monetary and emotional value lost by the tenants and owners.

## 2. Background

On 26 November 2025, a large fire broke out at the Wang Fuk Court apartment complex in Tai Po District, New Territories, Hong Kong.

- **Casualties**: At least 156 deaths and 79 injuries. One firefighter was killed in the line of duty.
- **Impact**: Widespread destruction of homes and displacement of residents.
- **Response**: Organizations, companies, and individuals locally and globally have pledged to donate for relief efforts.

This website attempts to track all public donations valued larger than HK$100,000.

## 3. Features

- **Bilingual Interface**: Full English and Chinese support.
- **Interactive Filtering**:
    - Filter by **Donation Type** (Cash / Goods)
    - Filter by **Origin** (e.g., Hong Kong, China, International)
    - Filter by **Industry** (e.g., Finance, Entertainment, Tech)
- **Dynamic Statistics**: Real-time summaries based on active filters.
- **Source Verification**: All entries link to primary or secondary public sources.

## 4. Data Source

Data is sourced from public announcements and news reports. The database is hosted on Google Sheets and syncs every 6 hours.

- **View Raw Data**: [Google Sheets](https://docs.google.com/spreadsheets/d/1dg6LxT5JElZZ5-owLMlD6uIFMsLpTfPU2cYCk5j79TI/edit?usp=sharing)
- **Corrections**:
    - Comment directly on the Google Sheet
    - [Submit an Issue](https://github.com/Taipo-Big-Donations-Watcher/Taipo-Big-Donations-Watcher.github.io/issues) on GitHub
    - Contact us via the link in the footer

---

## 五、技術架構 (Technical Architecture)

For developers interested in how this works:

```
┌─────────────────────────────────────────────────────────────┐
│                  GitHub Actions (Every 6 hours)             │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐ │
│  │ Google      │───▶│ Build Script │───▶│ Static HTML/JS │ │
│  │ Sheets API  │    │ (Node.js)    │    │ GitHub Pages   │ │
│  └─────────────┘    └──────────────┘    └────────────────┘ │
│       ▲                                          ▲          │
│       └─ .env.local (Credentials)                └─ /dist   │
└─────────────────────────────────────────────────────────────┘
```

### Local Development

1.  **Clone & Install**
    ```bash
    git clone https://github.com/Taipo-Big-Donations-Watcher/Taipo-Big-Donations-Watcher.github.io.git
    npm install
    ```

2.  **Setup Credentials**
    Create `.env.local` with `GOOGLE_SHEET_ID` and `GOOGLE_SERVICE_ACCOUNT`.

3.  **Build & Run**
    ```bash
    npm run build
    npx serve dist
    ```

## License

[GPL-3.0](LICENSE)
