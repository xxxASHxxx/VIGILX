# VIGILX SMS Backend

Backend server for VIGILX drowsiness detection SMS alerts using Twilio.

## Quick Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit .env with your Twilio credentials
```

### 3. Get Twilio Credentials

1. Sign up at [Twilio Console](https://console.twilio.com/)
2. From the dashboard, copy:
   - **Account SID**
   - **Auth Token**
3. Get a phone number:
   - Go to **Phone Numbers** → **Manage** → **Buy a number**
   - Or use the free trial number provided

### 4. Update .env File
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### 5. Start the Server
```bash
npm start
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server health check |
| `/api/send-sms` | POST | Send drowsiness alert SMS |
| `/api/test-sms` | POST | Send test SMS to verify config |

### Send SMS Request Body
```json
{
  "phoneNumber": "+1234567890",
  "alertType": "drowsiness",
  "timestamp": "2026-01-30T03:30:00Z",
  "source": "Dashcam",
  "dashboardType": "Commercial"
}
```

## Rate Limiting

- Maximum 10 SMS requests per minute per IP address
- Prevents accidental SMS spam

## Twilio Trial Account Notes

If using a Twilio trial account:
- You can only send SMS to verified phone numbers
- Verify numbers at: Console → Verified Caller IDs
- Messages will be prefixed with "Sent from your Twilio trial account"

## Troubleshooting

| Error | Solution |
|-------|----------|
| `TWILIO_NOT_CONFIGURED` | Check .env file has valid credentials |
| `INVALID_PHONE_NUMBER` | Use E.164 format (+1234567890) |
| `AUTH_FAILED` | Verify Account SID and Auth Token |
| `Rate limit exceeded` | Wait 1 minute between requests |
