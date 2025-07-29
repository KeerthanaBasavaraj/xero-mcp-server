# Business Insight Reports

This document describes the business insight report tools available in the Xero MCP Server, including the new rate-limited comprehensive reports.

## Overview

The business insight reports provide comprehensive financial analysis and business intelligence by aggregating data from multiple Xero API endpoints. Due to Xero's rate limiting (5 concurrent calls), the reports use intelligent batching and delays to ensure reliable data retrieval.

## Available Tools

### 1. `generateBusinessInsightReport`
**Purpose**: Raw data collection for business insight reports
- Fetches core financial data with rate limiting
- Returns structured JSON with all raw data
- Suitable for further processing or custom analysis

**Parameters**:
- `month`: Month in YYYY-MM format (e.g., "2024-01")

**Returns**: Raw data including:
- Profit & Loss (current and previous month)
- Budget summary
- Aged receivables
- Organisation details
- Contacts and invoices

### 2. `generateComprehensiveBusinessReport`
**Purpose**: Complete business insight report with structured analysis
- Generates comprehensive report with all required sections
- Includes calculated metrics and variances
- Provides actionable business insights

**Parameters**:
- `month`: Month in YYYY-MM format (e.g., "2024-01")

**Returns**: Structured report with the following sections:

#### 1. Basis of Preparation
- Data source information
- Report period details
- Organisation information
- Key assumptions

#### 2. Notes to Management
- Executive summary
- Key insights and trends
- Performance highlights

#### 3. Key Financial Metrics
- **Net Income**: Current value with percentage variance from previous month
- **Gross Profit**: Current value with budget variance
- **Account Receivable Days**: Days outstanding with variance from target (30 days)

#### 4. Client Analysis
- Total vs active clients
- Client growth metrics
- Top services by revenue

#### 5. Revenue & Expenses
- Current and previous month breakdown
- Revenue, total expenses, cost of sales
- Expense-to-revenue ratio

#### 6. Profit and Loss
- Complete actual vs budgeted data
- Detailed breakdown by section
- Variance analysis

## Rate Limiting Implementation

### Problem
Xero API has a rate limit of 5 concurrent calls. The original implementation used `Promise.all()` with 8 simultaneous calls, causing rate limit errors.

### Solution
Implemented intelligent batching with delays:

1. **Batching**: API calls are grouped into batches of 5 (maximum concurrent calls)
2. **Delays**: 1-second delay between batches to respect rate limits
3. **Retry Logic**: Automatic retry for rate limit errors (429 status)
4. **Error Handling**: Comprehensive error tracking and reporting

### Rate Limiting Features

- **Batch Size**: Configurable (default: 5 calls)
- **Delay Between Batches**: Configurable (default: 1000ms)
- **Retry Attempts**: Configurable (default: 3 attempts)
- **Retry Delay**: Exponential backoff (default: 2000ms base)

## API Calls Optimized

The comprehensive report makes only the necessary API calls:

### Batch 1 (Core Financial Data)
1. Current month Profit & Loss
2. Previous month Profit & Loss  
3. Budget summary
4. Aged receivables
5. Organisation details

### Batch 2 (Client & Transaction Data)
6. Contacts (first page)
7. Invoices (first page)

**Total**: 7 API calls (down from 8 in original implementation)

## Removed Unnecessary Calls

The following API calls were removed as they weren't required for the business insight report:
- Items (not needed for financial analysis)
- Quotes (not needed for financial analysis)

## Usage Examples

### Generate Raw Data
```json
{
  "tool": "generateBusinessInsightReport",
  "parameters": {
    "month": "2024-01"
  }
}
```

### Generate Comprehensive Report
```json
{
  "tool": "generateComprehensiveBusinessReport", 
  "parameters": {
    "month": "2024-01"
  }
}
```

## Error Handling

Both tools include comprehensive error handling:

1. **Individual API Errors**: Each API call error is tracked separately
2. **Rate Limit Errors**: Automatic retry with exponential backoff
3. **Data Validation**: Checks for missing or invalid data
4. **Graceful Degradation**: Returns partial data if some calls fail

## Performance Considerations

- **Execution Time**: ~3-4 seconds (including delays)
- **API Calls**: 7 calls in 2 batches
- **Memory Usage**: Minimal (streaming data processing)
- **Reliability**: High (with retry logic and error handling)

## Future Enhancements

1. **Caching**: Implement caching for frequently accessed data
2. **Incremental Updates**: Only fetch changed data
3. **Custom Metrics**: Allow custom metric calculations
4. **Export Formats**: Support for PDF, Excel, etc.
5. **Scheduled Reports**: Automated report generation

## Troubleshooting

### Common Issues

1. **Rate Limit Errors**: 
   - Increase delay between batches
   - Reduce batch size
   - Check API usage limits

2. **Missing Data**:
   - Verify Xero account has required data
   - Check API permissions
   - Review error logs

3. **Slow Performance**:
   - Reduce batch size
   - Increase delays
   - Check network connectivity

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=true
```

This will show detailed API call timing and rate limiting information. 