# Brave Web Search API

## Full Example

### Endpoint

```plaintext
https://api.search.brave.com/res/v1/web/search
```

### Request - no offset

```pl
curl -s --compressed "https://api.search.brave.com/res/v1/web/search?\
q=site%3Astatefarm.com%20state%20farm%20home%20owner%20rate%20texas\
&safesearch=strict&freshness=py&text_decorations=false&result_filter=web%2Cquery\
&extra_snippets=false&summary=false" \
     -H "Accept: application/json" \
     -H "Accept-Encoding: gzip" \
     -H "x-loc-country: US" \
     -H "x-subscription-token: [API TOKEN]"
```

### Request - with offset

```pl
curl -s --compressed "https://api.search.brave.com/res/v1/web/search?\
q=site%3Astatefarm.com%20state%20farm%20home%20owner%20rate%20texas&offset=1\
&safesearch=strict&freshness=py&text_decorations=false&result_filter=web%2Cquery\
&extra_snippets=false&summary=false" \
     -H "Accept: application/json" \
     -H "Accept-Encoding: gzip" \
     -H "x-loc-country: US" \
     -H "x-subscription-token: [API TOKEN]"
```

### Response

```json
{
  "query": {
    "original": "site:statefarm.com state farm home owner rate texas",
    "show_strict_warning": false,
    "altered": "site:statefarm.com state farm homeowners rate texas",
    "cleaned": "state farm homeowners rate texas",
    "is_navigational": false,
    "is_news_breaking": false,
    "spellcheck_off": false,
    "country": "us",
    "bad_results": false,
    "should_fallback": false,
    "postal_code": "",
    "city": "",
    "header_country": "us",
    "more_results_available": true,
    "state": "",
    "search_operators": {
      "applied": true,
      "cleaned_query": "state farm homeowners rate texas",
      "sites": ["statefarm.com"]
    }
  },
  "mixed": {
    "type": "mixed",
    "main": [
      {
        "type": "web",
        "index": 0,
        "all": false
      },
      {
        "type": "web",
        "index": 1,
        "all": false
      },
      {
        "type": "web",
        "index": 2,
        "all": false
      },
      {
        "type": "web",
        "index": 3,
        "all": false
      },
      {
        "type": "web",
        "index": 4,
        "all": false
      },
      {
        "type": "web",
        "index": 5,
        "all": false
      },
      {
        "type": "web",
        "index": 6,
        "all": false
      },
      {
        "type": "web",
        "index": 7,
        "all": false
      },
      {
        "type": "web",
        "index": 8,
        "all": false
      },
      {
        "type": "web",
        "index": 9,
        "all": false
      },
      {
        "type": "web",
        "index": 10,
        "all": false
      },
      {
        "type": "web",
        "index": 11,
        "all": false
      },
      {
        "type": "web",
        "index": 12,
        "all": false
      },
      {
        "type": "web",
        "index": 13,
        "all": false
      },
      {
        "type": "web",
        "index": 14,
        "all": false
      },
      {
        "type": "web",
        "index": 15,
        "all": false
      },
      {
        "type": "web",
        "index": 16,
        "all": false
      },
      {
        "type": "web",
        "index": 17,
        "all": false
      },
      {
        "type": "web",
        "index": 18,
        "all": false
      },
      {
        "type": "web",
        "index": 19,
        "all": false
      }
    ],
    "top": [],
    "side": []
  },
  "type": "search",
  "web": {
    "type": "search",
    "results": [
      {
        "title": "State Farm in California",
        "url": "https://newsroom.statefarm.com/state-farm-general-insurance-company-update-on-california-2-2025/",
        "is_source_local": false,
        "is_source_both": false,
        "description": "In a detailed letter to the CDI in March 2024, State Farm General said, “The swift capital depletion of State Farm General is an alarm signaling the grave need for rapid and transformational action, including the critical need for rapid review and approval of currently pending and future rate filings.” ... March 2024, another difficult decision was made to non-renew 30,000 homeowners policies, representing the company’s greatest catastrophe risk.",
        "page_age": "2025-06-30T05:41:00",
        "profile": {
          "name": "State Farm",
          "url": "https://newsroom.statefarm.com/state-farm-general-insurance-company-update-on-california-2-2025/",
          "long_name": "newsroom.statefarm.com",
          "img": "https://imgs.search.brave.com/4s_J01A6trRWFAwM8d3r2zgk5SlzL9QrV7tGIYKJIaY/rs:fit:32:32:1:0/g:ce/aHR0cDovL2Zhdmlj/b25zLnNlYXJjaC5i/cmF2ZS5jb20vaWNv/bnMvMWIyZTE4YzUy/ZDFlMjE5ZTZhZDc0/MzdkM2QwMDZhMjJk/NWUyYzE0NzE3MDk1/OWU5OWM4MGVmNjQz/NWZmYTI3My9uZXdz/cm9vbS5zdGF0ZWZh/cm0uY29tLw"
        },
        "language": "en",
        "family_friendly": true,
        "type": "search_result",
        "subtype": "article",
        "is_live": false,
        "meta_url": {
          "scheme": "https",
          "netloc": "newsroom.statefarm.com",
          "hostname": "newsroom.statefarm.com",
          "favicon": "https://imgs.search.brave.com/4s_J01A6trRWFAwM8d3r2zgk5SlzL9QrV7tGIYKJIaY/rs:fit:32:32:1:0/g:ce/aHR0cDovL2Zhdmlj/b25zLnNlYXJjaC5i/cmF2ZS5jb20vaWNv/bnMvMWIyZTE4YzUy/ZDFlMjE5ZTZhZDc0/MzdkM2QwMDZhMjJk/NWUyYzE0NzE3MDk1/OWU5OWM4MGVmNjQz/NWZmYTI3My9uZXdz/cm9vbS5zdGF0ZWZh/cm0uY29tLw",
          "path": "› state-farm-general-insurance-company-update-on-california-2-2025"
        },
        "thumbnail": {
          "src": "https://imgs.search.brave.com/YVmJZtJCqCB4tpzwJtXCDgRC7cp5p1sLLtCkHfMD3W4/rs:fit:200:200:1:0/g:ce/aHR0cHM6Ly9jb250/ZW50LnByZXNzcGFn/ZS5jb20vdXBsb2Fk/cy8xNDQxL2Y1M2Fj/NzliLTUyMDMtNDc5/OS1iNWIyLTI4Mjdi/MTliYmM0OS8xOTIw/XzI1MDIxNC1jYWxp/Zm9ybmlhLXVwZGF0/ZS1idy5wbmc_MTAw/MDA",
          "original": "https://content.presspage.com/uploads/1441/f53ac79b-5203-4799-b5b2-2827b19bbc49/1920_250214-california-update-bw.png?10000",
          "logo": false
        },
        "age": "June 30, 2025"
      }
    ],
    "family_friendly": true
  }
}
```
