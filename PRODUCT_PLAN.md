# Amazon Store Management Platform - Product Plan

> Competitor Reference: Pacvue, Helium 10, Jungle Scout, Perpetua, Teikametrics

---

## Phase 0: Foundation & API Access

### Amazon Developer Setup
- [ ] Register as Amazon Advertising API developer
- [ ] Register for Selling Partner API (SP-API) access
- [ ] Set up OAuth 2.0 authentication flow
- [ ] Build token refresh mechanism
- [ ] Create sandbox/test environment

### Core Infrastructure
- [x] Define tech stack (frontend, backend, database)
- [x] Set up multi-tenant architecture (one platform, many clients)
- [x] User authentication & authorization system (Supabase Auth)
- [ ] Role-based access control (Admin, Manager, Viewer)
- [ ] API rate limiting handler (Amazon has strict limits)
- [ ] Data sync scheduler (pull data from Amazon periodically)

---

## Phase 1: Client & Account Management

### Client Onboarding
- [x] Client registration flow (CRUD for clients)
- [ ] Amazon account OAuth connection (SP-API)
- [ ] Amazon Advertising account connection
- [ ] Multiple marketplace support (US, CA, UK, DE, etc.)
- [ ] Client profile & settings management

### User Management
- [ ] Invite team members per client
- [ ] Permission levels (full access, read-only, specific features)
- [ ] Activity logging / audit trail
- [ ] White-label options (your branding vs client branding)

---

## Phase 2: Advertising Management (Core Revenue Driver)

### Campaign Visibility
- [ ] Pull all Sponsored Products campaigns
- [ ] Pull all Sponsored Brands campaigns
- [ ] Pull all Sponsored Display campaigns
- [ ] Campaign performance dashboard (impressions, clicks, spend, sales, ACoS, ROAS)
- [ ] Historical performance charts

### Campaign Management
- [ ] Create new campaigns from platform
- [ ] Edit campaign settings (budget, status, targeting)
- [ ] Bulk campaign operations (pause/enable multiple)
- [ ] Ad group management
- [ ] Keyword management (add, pause, adjust bids)
- [ ] Negative keyword management
- [ ] Product targeting management

### Bid Optimization
- [ ] Manual bid adjustment interface
- [ ] Bid rules engine (if ACoS > X, reduce bid by Y%)
- [ ] Dayparting (adjust bids by time of day)
- [ ] Automated bid suggestions based on performance
- [ ] Budget pacing alerts

### Keyword Research & Discovery
- [ ] Search term report analysis
- [ ] Keyword performance ranking
- [ ] Negative keyword recommendations
- [ ] Competitor keyword insights (where possible)
- [ ] Keyword harvesting (auto to manual promotion)

---

## Phase 3: Analytics & Reporting

### Dashboard
- [ ] Cross-client overview dashboard
- [x] Per-client performance dashboard (Brand Analytics Dashboard with charts)
- [ ] Customizable date ranges
- [ ] Comparison periods (vs last week, last month, last year)
- [x] Key metrics widgets (Revenue, Units, Brand Share, Conversion)

### Reports
- [ ] Campaign performance reports
- [ ] Keyword performance reports
- [x] Product performance reports (view uploaded data)
- [x] Search term reports (view uploaded data)
- [ ] Scheduled report generation (daily/weekly/monthly)
- [ ] Export to CSV/Excel/PDF
- [ ] Email report delivery

### Manual Data Upload (Pre-API)
- [x] Daily Sales & Traffic CSV upload
- [x] Product Performance CSV upload
- [x] Search Query Performance CSV upload
- [x] Inventory TSV upload

### Alerts & Notifications
- [ ] Budget depletion alerts
- [ ] ACoS threshold alerts
- [ ] Campaign status change alerts
- [ ] Performance anomaly detection
- [ ] Email/SMS/In-app notification options

---

## Phase 4: Retail Analytics (Sales & Inventory)

### Sales Performance
- [ ] Pull sales data via SP-API
- [x] Revenue tracking by product/ASIN (via CSV upload)
- [x] Units sold tracking (via CSV upload)
- [ ] Profit margin calculations (if cost data provided)
- [x] Sales velocity trends (Sessions & Units chart)

### Inventory Management
- [x] Current inventory levels (via TSV upload)
- [ ] Inventory age tracking
- [ ] Low stock alerts
- [ ] Restock recommendations
- [ ] FBA vs FBM inventory split

### Buy Box Monitoring
- [ ] Buy Box win percentage tracking
- [ ] Buy Box loss alerts
- [ ] Competitor price tracking (limited by Amazon ToS)

### Product Performance
- [ ] ASIN-level performance dashboard
- [ ] Organic vs paid sales attribution
- [ ] Review/rating tracking
- [ ] Listing quality score

---

## Phase 5: Automation & Rules Engine

### Rule Builder
- [ ] Visual rule builder interface
- [ ] Condition types (metric thresholds, time-based, comparison)
- [ ] Action types (adjust bid, pause, enable, notify)
- [ ] Rule scheduling (run frequency)
- [ ] Rule history/logs

### Pre-built Automation Templates
- [ ] ACoS target maintenance
- [ ] Budget pacing
- [ ] Keyword harvesting automation
- [ ] Poor performer pausing
- [ ] Seasonal bid adjustments

### AI/ML Features (Advanced)
- [ ] Predictive bid optimization
- [ ] Anomaly detection
- [ ] Performance forecasting
- [ ] Automated keyword suggestions

---

## Phase 6: Advanced Features

### Amazon DSP Integration
- [ ] DSP account connection
- [ ] DSP campaign management
- [ ] DSP reporting
- [ ] Full-funnel attribution

### Multi-Marketplace
- [ ] Unified view across marketplaces
- [ ] Currency conversion
- [ ] Marketplace comparison reports

### Competitor Intelligence
- [x] Share of voice tracking (pie chart from search term data)
- [ ] Competitor ad monitoring
- [ ] Market trend analysis

### Catalog & Content
- [ ] Listing content management
- [ ] A+ Content tracking
- [ ] Listing optimization suggestions
- [ ] Keyword in listing tracking

---

## Phase 7: Agency/Network Features

### Client Billing
- [ ] Usage tracking per client
- [ ] Invoice generation
- [ ] Payment processing integration
- [ ] Margin/markup settings

### White Label
- [ ] Custom domain support
- [ ] Custom branding (logo, colors)
- [ ] Branded email notifications
- [ ] Branded reports

### Agency Dashboard
- [ ] All clients overview
- [ ] Team performance tracking
- [ ] Workload distribution
- [ ] Client health scores

---

## Technical Debt & Maintenance

### Performance
- [ ] Database optimization
- [ ] Caching layer (Redis)
- [ ] Background job processing
- [ ] API response time monitoring

### Security
- [ ] SOC 2 compliance preparation
- [ ] Data encryption at rest
- [ ] Data encryption in transit
- [ ] Regular security audits
- [ ] GDPR compliance (if serving EU)

### Reliability
- [ ] Error monitoring (Sentry, etc.)
- [ ] Uptime monitoring
- [ ] Backup & disaster recovery
- [ ] Load testing

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-28 | Frontend: React | Popular, large ecosystem |
| 2026-01-28 | Backend: NestJS (Node.js/TypeScript) | Structured, enterprise-ready |
| 2026-01-28 | Database: Supabase (PostgreSQL) | Auth + DB + realtime included |
| 2026-01-28 | Frontend Hosting: Netlify | Simple deploys |
| 2026-01-28 | Backend Hosting: TBD (Railway/Render) | Netlify doesn't host Node backends |
| | MVP feature set | |
| | Pricing model | |
| | Target market segment | |

---

## Tech Stack

```
Frontend:        React + TypeScript
State:           React Query (for API data) + Zustand (for UI state)
UI Components:   Tailwind CSS + shadcn/ui
Backend:         NestJS (TypeScript)
Database:        Supabase (PostgreSQL)
Auth:            Supabase Auth
File Storage:    Supabase Storage
Hosting:         Netlify (frontend) + Railway (backend)
```

---

## Notes

### API Rate Limits to Consider
- Amazon Advertising API: Varies by endpoint, generally 10-100 req/sec
- SP-API: Token bucket system, varies by endpoint

### Key Competitors to Study
- **Pacvue** - Enterprise, full suite
- **Perpetua** - Focus on automation
- **Teikametrics** - AI-driven bidding
- **Helium 10** - Seller tools, keyword research
- **Jungle Scout** - Product research, lighter ads
- **Quartile** - AI bidding
- **Intentwise** - Analytics focused

### Amazon Program Requirements
- Must apply for Amazon Advertising API access
- Must apply for SP-API access (separate process)
- May need to demonstrate existing Amazon business/agency relationship
- MWS is deprecated - use SP-API only

---

## MVP Recommendation

For a first launch, focus on:
1. Phase 0 (Foundation) - Required
2. Phase 1 (Client Management) - Required
3. Phase 2 (Advertising) - Core value prop
4. Phase 3 (Analytics) - Differentiation

This gives you a functional advertising management tool that agencies can use immediately.
