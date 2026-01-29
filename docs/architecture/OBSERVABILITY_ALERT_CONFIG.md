# ADR-025: Observability & Health Checks - Alert Configuration Guide

## Overview

This document provides the configuration guide for setting up Application Insights alerts to monitor the AssetSim Pro ticker/SignalR broadcasting system, as specified in ADR-025.

## Key Metrics

The ticker generator and SignalR broadcast system emits the following custom metrics to Application Insights:

### 1. UpdatesBroadcasted (Primary Heartbeat Metric)

- **Description**: Total number of price updates successfully broadcast via SignalR
- **Type**: Counter (increments by 1 for each broadcast)
- **Properties**:
  - `exchangeId`: The exchange identifier
  - `symbol`: The trading symbol (e.g., AAPL, BTC, ETH)
- **Purpose**: Primary heartbeat metric to ensure the ticker is actively broadcasting market data
- **Alert Threshold**: < 100 updates in 5 minutes triggers Sev1 alert

### 2. BroadcastFailures

- **Description**: Number of failed broadcast attempts
- **Type**: Counter (increments by 1 for each failure)
- **Properties**:
  - `exchangeId`: The exchange identifier
  - `symbol`: The trading symbol
  - `error`: Error message describing the failure
- **Purpose**: Detect and diagnose broadcasting issues

### 3. DeadbandFiltered

- **Description**: Number of price updates filtered out by the deadband threshold (<$0.01 price change)
- **Type**: Counter (increments by 1 for each filtered update)
- **Properties**:
  - `exchangeId`: The exchange identifier
  - `symbol`: The trading symbol
- **Purpose**: Insights into optimization effectiveness and market activity levels

### 4. BroadcastLatency

- **Description**: Time taken to broadcast a price update (in milliseconds)
- **Type**: Gauge (duration value)
- **Properties**:
  - `exchangeId`: The exchange identifier
  - `symbol`: The trading symbol
- **Purpose**: Monitor performance and detect latency issues

---

## Alert Configuration

### Sev1 Alert: Ticker Heartbeat Failure

**Alert Name**: `AssetSim-Ticker-Heartbeat-Failure`

**Description**: Triggers when the ticker generator stops broadcasting market data, indicating a critical system failure.

**Severity**: Sev1 (Critical)

**Condition**: `UpdatesBroadcasted < 100 in 5 minutes`

**Metric**: `customMetrics/UpdatesBroadcasted`

**Configuration Steps**:

1. Navigate to Azure Portal → Application Insights → Your AssetSim Pro instance
2. Select **Alerts** → **New alert rule**
3. Configure the condition:
   - **Signal type**: Metrics
   - **Metric namespace**: Custom metrics
   - **Metric name**: `UpdatesBroadcasted`
   - **Aggregation type**: Sum
   - **Aggregation granularity (Period)**: 5 minutes
   - **Operator**: Less than
   - **Threshold value**: 100
   - **Frequency of evaluation**: 1 minute

4. Configure action groups:
   - Create or select an action group
   - Add notification channels (email, SMS, PagerDuty, etc.)
   - Set severity to **Sev1**

5. Configure alert details:
   - **Alert rule name**: `AssetSim-Ticker-Heartbeat-Failure`
   - **Description**: "Critical: Ticker generator is not broadcasting market data"
   - **Severity**: Sev1 (Critical)
   - **Enable alert rule upon creation**: Yes

6. Review and create the alert rule

### Azure CLI Configuration

Alternatively, you can create the alert using Azure CLI:

```bash
# Set variables
RESOURCE_GROUP="your-resource-group"
APP_INSIGHTS_NAME="your-app-insights-name"
ACTION_GROUP_ID="/subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.Insights/actionGroups/{action-group-name}"

# Get Application Insights resource ID
APP_INSIGHTS_ID=$(az monitor app-insights component show \
  --app "$APP_INSIGHTS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query id -o tsv)

# Create the alert rule
az monitor metrics alert create \
  --name "AssetSim-Ticker-Heartbeat-Failure" \
  --resource-group "$RESOURCE_GROUP" \
  --scopes "$APP_INSIGHTS_ID" \
  --condition "sum customMetrics/UpdatesBroadcasted < 100" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 1 \
  --description "Critical: Ticker generator is not broadcasting market data" \
  --action "$ACTION_GROUP_ID"
```

### Terraform Configuration

```hcl
resource "azurerm_monitor_metric_alert" "ticker_heartbeat_failure" {
  name                = "AssetSim-Ticker-Heartbeat-Failure"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_application_insights.app_insights.id]
  description         = "Critical: Ticker generator is not broadcasting market data"
  severity            = 1
  frequency           = "PT1M"
  window_size         = "PT5M"
  enabled             = true

  criteria {
    metric_namespace = "microsoft.applicationinsights/components/customMetrics"
    metric_name      = "UpdatesBroadcasted"
    aggregation      = "Sum"
    operator         = "LessThan"
    threshold        = 100

    dimension {
      name     = "cloud/roleName"
      operator = "Include"
      values   = ["*"]
    }
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical_alerts.id
  }

  tags = {
    Environment = var.environment
    Component   = "Ticker"
    Severity    = "Sev1"
  }
}
```

---

## Additional Recommended Alerts

### Sev2 Alert: High Broadcast Failure Rate

**Alert Name**: `AssetSim-High-Broadcast-Failures`

**Condition**: `BroadcastFailures > 10 in 5 minutes`

**Purpose**: Detect partial failures or degraded performance

### Sev3 Alert: High Broadcast Latency

**Alert Name**: `AssetSim-High-Broadcast-Latency`

**Condition**: `avg(BroadcastLatency) > 500ms in 5 minutes`

**Purpose**: Detect performance degradation

---

## Monitoring Dashboard

### Recommended KQL Queries

#### 1. Broadcast Health Overview

```kusto
customMetrics
| where name in ("UpdatesBroadcasted", "BroadcastFailures", "DeadbandFiltered")
| summarize
    TotalBroadcasts = sumif(value, name == "UpdatesBroadcasted"),
    TotalFailures = sumif(value, name == "BroadcastFailures"),
    TotalFiltered = sumif(value, name == "DeadbandFiltered")
    by bin(timestamp, 5m)
| extend SuccessRate = (TotalBroadcasts * 100.0) / (TotalBroadcasts + TotalFailures)
| project timestamp, TotalBroadcasts, TotalFailures, TotalFiltered, SuccessRate
| order by timestamp desc
```

#### 2. Broadcast Latency Percentiles

```kusto
customMetrics
| where name == "BroadcastLatency"
| summarize
    P50 = percentile(value, 50),
    P90 = percentile(value, 90),
    P99 = percentile(value, 99),
    Max = max(value)
    by bin(timestamp, 5m)
| order by timestamp desc
```

#### 3. Per-Exchange Activity

```kusto
customMetrics
| where name == "UpdatesBroadcasted"
| extend exchangeId = tostring(customDimensions.exchangeId)
| summarize BroadcastCount = sum(value) by exchangeId, bin(timestamp, 5m)
| order by timestamp desc, BroadcastCount desc
```

#### 4. Top Symbols by Broadcast Volume

```kusto
customMetrics
| where name == "UpdatesBroadcasted"
| extend
    symbol = tostring(customDimensions.symbol),
    exchangeId = tostring(customDimensions.exchangeId)
| summarize BroadcastCount = sum(value) by symbol, exchangeId
| order by BroadcastCount desc
| take 20
```

---

## Testing the Alerts

### 1. Verify Metrics are Being Published

```bash
# Query Application Insights for recent metrics
az monitor app-insights metrics show \
  --app "$APP_INSIGHTS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --metric "customMetrics/UpdatesBroadcasted" \
  --aggregation sum \
  --interval PT5M \
  --start-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)"
```

### 2. Simulate Alert Condition

To test the alert, temporarily stop the ticker generator:

1. In Azure Portal, navigate to your Function App
2. Disable the `tickerGenerator` function
3. Wait 5 minutes for the alert to trigger
4. Verify you receive the alert notification
5. Re-enable the function

### 3. Monitor Alert History

Navigate to Azure Portal → Application Insights → Alerts → Alert history to view triggered alerts and their resolution status.

---

## Troubleshooting

### Metrics Not Appearing

1. **Check Application Insights connection string**:
   - Verify `APPLICATIONINSIGHTS_CONNECTION_STRING` is set in Function App settings
   - Check that the connection string is valid

2. **Check Function App is running**:

   ```bash
   az functionapp show \
     --name "$FUNCTION_APP_NAME" \
     --resource-group "$RESOURCE_GROUP" \
     --query state
   ```

3. **Review Function logs**:
   - Navigate to Azure Portal → Function App → Functions → tickerGenerator
   - Check "Monitor" tab for execution logs
   - Look for telemetry-related warnings or errors

### Alert Not Triggering

1. **Verify alert rule is enabled**:

   ```bash
   az monitor metrics alert show \
     --name "AssetSim-Ticker-Heartbeat-Failure" \
     --resource-group "$RESOURCE_GROUP" \
     --query enabled
   ```

2. **Check metric values**:
   - Use the KQL queries above to verify metric values meet the alert condition
   - Verify the aggregation type and time window are correct

3. **Test action group**:
   ```bash
   az monitor action-group test-notifications create \
     --action-group-name "your-action-group" \
     --resource-group "$RESOURCE_GROUP" \
     --alert-type "servicehealth"
   ```

---

## Maintenance

### Regular Review

- **Weekly**: Review broadcast success rates and latency trends
- **Monthly**: Adjust alert thresholds based on actual traffic patterns
- **Quarterly**: Review and optimize deadband filtering effectiveness

### Threshold Tuning

The alert threshold of 100 updates per 5 minutes is based on:

- Ticker runs every 1 second (60 ticks per minute, 300 ticks per 5 minutes)
- Multiple symbols per exchange
- Deadband filtering reducing actual broadcasts by ~50%

Adjust the threshold based on:

- Number of active exchanges
- Number of symbols per exchange
- Observed deadband filtering rate
- Market volatility patterns

---

## References

- **[Documentation Hub](../README.md)** - Complete documentation index
- [Azure Monitor Metrics Alerts Documentation](https://docs.microsoft.com/azure/azure-monitor/alerts/alerts-metric)
- [Application Insights Custom Metrics](https://docs.microsoft.com/azure/azure-monitor/app/api-custom-events-metrics)
- [ARCHITECTURE.md ADR-025](../../ARCHITECTURE.md#adr-025-observability--health-checks)
