## Response Headers

#### Global

This table lists the response headers supported by the Web Search API.

| Header | Name | Description |
| --- | --- | --- |
| X-RateLimit-Limit | Rate Limit | Rate limits associated with the requested plan.  An example rate limit `X-RateLimit-Limit: 1, 15000` means 1 request per second and 15000 requests per month. |
| X-RateLimit-Policy | Rate Limit Policy | Rate limit policies currently associated with the requested plan.  An example policy `X-RateLimit-Policy: 1;w=1, 15000;w=2592000` means a limit of 1 request over a 1 second window and 15000 requests over a month window. The windows are always given in seconds. |
| X-RateLimit-Remaining | Rate Limit Remaining | Remaining quota units associated with the expiring limits.  An example remaining limit `X-RateLimit-Remaining: 1, 1000` indicates the API is able to be accessed once during the current second, and 1000 times over the current month.  **Note**: Only successful requests are counted and billed. |
| X-RateLimit-Reset | Rate Limit Reset | The number of seconds until the quota associated with the expiring limits resets.  An example reset limit `X-RateLimit-Reset: 1, 1419704` means a single request can be done again in a second and in 1419704 seconds the full monthly quota associated with the plan will be available again. |
