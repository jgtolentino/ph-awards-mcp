# PH Awards MCP Service

Standalone REST API for Philippine Awards Campaign Intelligence

## Features

- ✅ Campaign statistics and analytics
- ✅ Award prediction algorithms
- ✅ Filipino cultural intelligence
- ✅ Campaign search and filtering
- ✅ SQLite database integration

## API Endpoints

- `GET /health` - Service health check
- `GET /api/v1/ph-awards/stats` - Campaign statistics
- `POST /api/v1/ph-awards/campaigns/search` - Search campaigns
- `GET /api/v1/ph-awards/cultural/trends` - Cultural trends
- `POST /api/v1/ph-awards/predict/award` - Award prediction

## Deployment

Deploy to Render with:
- Build Command: `npm install`
- Start Command: `npm start`
- Environment: Node.js 18+

## Usage

```bash
# Health check
curl https://your-service.onrender.com/health

# Get statistics
curl https://your-service.onrender.com/api/v1/ph-awards/stats

# Predict award potential
curl -X POST https://your-service.onrender.com/api/v1/ph-awards/predict/award \
  -H "Content-Type: application/json" \
  -d '{"campaign_text": "Your campaign description"}'
```

## Database

Uses SQLite database `ces_intelligence.db` with Philippine Awards campaign data.