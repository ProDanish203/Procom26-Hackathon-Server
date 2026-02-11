# Currency Analyzer Module

AI-powered currency exchange analysis and recommendations for bulk money transfers.

## Features

- **Real-time Exchange Rates**: Get current exchange rates using the free Frankfurter API
- **Historical Trends**: Analyze 30-day currency trends with statistics (avg, min, max, volatility)
- **AI Recommendations**: Get intelligent transfer timing recommendations powered by Google Gemini AI
- **Risk Assessment**: Understand volatility and risk levels for your transfers

## API Endpoints

### 1. Get Current Exchange Rate
```http
GET /currency/rate?from=USD&to=PKR
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Current exchange rate retrieved successfully",
  "success": true,
  "data": {
    "rate": 278.50,
    "from": "USD",
    "to": "PKR"
  }
}
```

### 2. Get Currency Trends
```http
GET /currency/trends?from=USD&to=PKR&days=30
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Currency trends retrieved successfully",
  "success": true,
  "data": {
    "rates": { "2026-01-15": { "PKR": 275.20 }, ... },
    "current": 278.50,
    "avg30": 275.20,
    "min": 270.15,
    "max": 281.30,
    "volatility": 0.015
  }
}
```

### 3. Analyze Transfer (AI-Powered)
```http
POST /currency/analyze
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 50000,
  "fromCurrency": "USD",
  "toCurrency": "PKR"
}
```

**Response:**
```json
{
  "message": "Transfer analysis completed successfully",
  "success": true,
  "data": {
    "currentRate": 278.50,
    "historicalData": {
      "current": 278.50,
      "avg30": 275.20,
      "min": 270.15,
      "max": 281.30,
      "volatility": 0.015
    },
    "recommendation": {
      "recommendation": "wait",
      "reasoning": "Current rate is 1.2% above 30-day average with low volatility. Waiting 1-3 days could yield better rates.",
      "potentialSavings": 82500,
      "riskLevel": "low",
      "suggestedTimeframe": "1-3 days",
      "confidenceScore": 0.78
    },
    "estimatedAmount": 13925000
  }
}
```

## Supported Currencies

The module supports all major currencies available in the Frankfurter API, including:
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- AED (UAE Dirham)
- SAR (Saudi Riyal)
- And many more...

Target currency is typically PKR (Pakistani Rupee) for this banking application.

## How It Works

1. **Currency Service**: Fetches real-time and historical data from Frankfurter API
2. **Statistical Analysis**: Calculates 30-day averages, min/max, and volatility (coefficient of variation)
3. **AI Analysis**: Uses Google Gemini AI to analyze market conditions and provide recommendations
4. **Risk Assessment**: Evaluates volatility to determine risk levels (low/medium/high)

## AI Recommendation Logic

The AI considers:
- Current rate vs 30-day average
- Market volatility trends
- Potential savings if waiting
- Risk assessment based on historical data
- Confidence score based on data quality

**Recommendation Types:**
- `transfer_now`: Current rate is favorable or trending worse
- `wait`: Reasonable expectation of rate improvement

**Risk Levels:**
- Low: Volatility < 2%
- Medium: Volatility 2-5%
- High: Volatility > 5%

## Dependencies

- `@nestjs/axios`: HTTP client for API calls
- `axios`: HTTP library
- `AiModule`: For AI-powered analysis using Google Gemini
- Frankfurter API: Free currency exchange rate API (no API key required)

## Error Handling

All endpoints include proper error handling:
- Invalid currency codes return 400 Bad Request
- API failures return 500 Internal Server Error
- Unauthorized access returns 401 Unauthorized
- All errors are logged using AppLoggerService

## Usage Example

```typescript
// In your frontend or API client
const analyzeTransfer = async (amount: number, from: string, to: string) => {
  const response = await fetch('/currency/analyze', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ amount, fromCurrency: from, toCurrency: to })
  });
  
  const data = await response.json();
  
  if (data.data.recommendation.recommendation === 'transfer_now') {
    console.log('Transfer now!', data.data.recommendation.reasoning);
  } else {
    console.log('Wait for better rates:', data.data.recommendation.reasoning);
    console.log('Potential savings:', data.data.recommendation.potentialSavings, 'PKR');
  }
};
```

## Notes

- Historical data defaults to 30 days if not specified
- Maximum historical data range is 365 days
- All currency codes must be valid ISO 4217 codes (3 letters)
- The AI provides fallback recommendations if analysis fails
- Rates are updated in real-time from Frankfurter API
