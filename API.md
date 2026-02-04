# API Documentation - Bantuanku

Base URL: `https://api.bantuanku.org/v1`

## Authentication

Gunakan JWT token di header untuk authenticated endpoints:

```
Authorization: Bearer <token>
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {...},
  "message": "Success message"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

## Rate Limiting

- Auth endpoints: 5 requests per 15 minutes
- Payment endpoints: 10 requests per minute
- Other endpoints: 60 requests per minute

Headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 2024-01-01T00:00:00.000Z
```

## Authentication Endpoints

### Register

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "081234567890"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "usr_xxx",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "message": "Registration successful"
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_xxx",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "Login successful"
}
```

## Campaign Endpoints

### List Campaigns

```http
GET /campaigns?page=1&limit=10&status=active&category=pendidikan
```

Query Parameters:
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): active|completed|cancelled
- `category` (string): Category slug
- `pillar` (string): Pillar name
- `isFeatured` (boolean): Featured campaigns only
- `isUrgent` (boolean): Urgent campaigns only

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "cmp_xxx",
      "title": "Bantu Pendidikan Anak Yatim",
      "slug": "bantu-pendidikan-anak-yatim",
      "description": "...",
      "imageUrl": "https://...",
      "goal": 10000000,
      "collected": 5000000,
      "donorCount": 50,
      "status": "active",
      "isFeatured": true,
      "isUrgent": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

### Get Campaign Detail

```http
GET /campaigns/:slug
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "cmp_xxx",
    "title": "Bantu Pendidikan Anak Yatim",
    "slug": "bantu-pendidikan-anak-yatim",
    "description": "...",
    "content": "...",
    "imageUrl": "https://...",
    "images": ["https://..."],
    "videoUrl": "https://...",
    "goal": 10000000,
    "collected": 5000000,
    "donorCount": 50,
    "category": "Pendidikan",
    "pillar": "Pendidikan",
    "status": "active",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Donation Endpoints

### Create Donation

```http
POST /donations
Content-Type: application/json

{
  "campaignId": "cmp_xxx",
  "amount": 100000,
  "donorName": "John Doe",
  "donorEmail": "john@example.com",
  "donorPhone": "081234567890",
  "isAnonymous": false,
  "message": "Semoga bermanfaat"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "dnt_xxx",
    "referenceId": "DNT-20240101-XXXXX",
    "amount": 100000,
    "expiredAt": "2024-01-02T00:00:00.000Z"
  },
  "message": "Donation created"
}
```

### Check Donation Status

```http
GET /donations/check/:referenceId
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "dnt_xxx",
    "referenceId": "DNT-20240101-XXXXX",
    "donorName": "John Doe",
    "amount": 100000,
    "paymentStatus": "success",
    "paidAt": "2024-01-01T12:00:00.000Z"
  }
}
```

## Payment Endpoints

### Get Payment Methods

```http
GET /payments/methods
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "pm_xxx",
      "code": "bca_va",
      "name": "BCA Virtual Account",
      "type": "bank_transfer",
      "icon": "https://...",
      "fee": 4000,
      "minAmount": 10000,
      "maxAmount": 50000000
    }
  ]
}
```

### Create Payment

```http
POST /payments/create
Content-Type: application/json

{
  "donationId": "dnt_xxx",
  "methodId": "pm_xxx"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_xxx",
    "paymentCode": "1234567890123456",
    "paymentUrl": "https://app.midtrans.com/snap/xxx",
    "qrCode": "data:image/png;base64,...",
    "expiredAt": "2024-01-02T00:00:00.000Z"
  }
}
```

## Zakat Endpoints

### Calculate Income Zakat

```http
POST /zakat/calculate/income
Content-Type: application/json

{
  "monthlyIncome": 10000000,
  "months": 12
}
```

Response:
```json
{
  "success": true,
  "data": {
    "income": 120000000,
    "nisabValue": 85000000,
    "isEligible": true,
    "zakatAmount": 3000000,
    "calculation": {
      "rate": 0.025,
      "formula": "income * 0.025"
    }
  }
}
```

### Calculate Maal (Wealth) Zakat

```http
POST /zakat/calculate/maal
Content-Type: application/json

{
  "cash": 50000000,
  "savings": 100000000,
  "stocks": 30000000,
  "receivables": 10000000,
  "debts": 20000000
}
```

Response:
```json
{
  "success": true,
  "data": {
    "totalAssets": 190000000,
    "totalDebts": 20000000,
    "netAssets": 170000000,
    "nisabValue": 85000000,
    "isEligible": true,
    "zakatAmount": 4250000
  }
}
```

## Search Endpoints

### Global Search

```http
GET /search?q=pendidikan&type=all
```

Query Parameters:
- `q` (string): Search keyword
- `type` (string): all|campaigns|donations|users

Response:
```json
{
  "success": true,
  "data": {
    "campaigns": [...],
    "donations": [...],
    "users": [...]
  }
}
```

### Advanced Campaign Search

```http
GET /search/campaigns?search=pendidikan&category=pendidikan&minGoal=1000000&sort=popular
```

Query Parameters:
- `search` (string): Search keyword
- `category` (string): Category filter
- `pillar` (string): Pillar filter
- `status` (string): Status filter
- `isFeatured` (boolean): Featured only
- `isUrgent` (boolean): Urgent only
- `minGoal` (number): Minimum goal
- `maxGoal` (number): Maximum goal
- `sort` (string): latest|popular|collected|urgent|ending

## Admin Endpoints

### Dashboard Stats

```http
GET /admin/dashboard/stats
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "totalCampaigns": 100,
    "activeCampaigns": 50,
    "totalDonations": 1000,
    "totalAmount": 500000000,
    "totalDonors": 300,
    "pendingDisbursements": 10
  }
}
```

### Donation Summary Report

```http
GET /admin/reports/donations-summary?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalDonations": 1000,
      "totalAmount": 500000000,
      "totalFees": 10000000,
      "avgDonation": 500000,
      "uniqueDonors": 300
    },
    "byCampaign": [...],
    "byDate": [...]
  }
}
```

### Export Donations

```http
GET /admin/export/donations?startDate=2024-01-01&endDate=2024-12-31&paymentStatus=success
Authorization: Bearer <token>
```

Response: CSV file download

## Error Codes

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `415` - Unsupported Media Type
- `429` - Too Many Requests
- `500` - Internal Server Error

## Webhook Endpoints

### Payment Webhook

Endpoint untuk payment gateway callback:

```http
POST /payments/:gateway/webhook
X-Callback-Token: <signature>

{
  "transaction_status": "settlement",
  "order_id": "DNT-20240101-XXXXX",
  ...
}
```

Response:
```json
{
  "success": true,
  "data": {
    "received": true
  }
}
```

## Testing

### Postman Collection

Import collection dari `postman_collection.json`

### Example cURL Requests

```bash
# Register
curl -X POST https://api.bantuanku.org/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST https://api.bantuanku.org/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# List campaigns
curl https://api.bantuanku.org/v1/campaigns?page=1&limit=10

# Create donation
curl -X POST https://api.bantuanku.org/v1/donations \
  -H "Content-Type: application/json" \
  -d '{"campaignId":"cmp_xxx","amount":100000,"donorName":"John Doe"}'
```
