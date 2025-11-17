## Response Objects

#### [#](https://api-dashboard.search.brave.com/app/documentation/web-search/#WebSearchApiResponse) WebSearchApiResponse

Top level response model for successful Web Search API requests. The response will include the relevant keys based on the plan subscribed, query relevance or applied [`result_filter`](https://api-dashboard.search.brave.com/app/documentation/web-search/query#result_filter) as a query parameter. The API can also respond back with an error response based on invalid subscription keys and rate limit events.

| Field       | Type                                                                                                      | Required | Description                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| type        | "search"                                                                                                  | true     | The type of web search API result. The value is always `search`.                 |
| discussions | [Discussions](https://api-dashboard.search.brave.com/app/documentation/web-search/#Discussions)           | false    | Discussions clusters aggregated from forum posts that are relevant to the query. |
| faq         | [FAQ](https://api-dashboard.search.brave.com/app/documentation/web-search/#FAQ)                           | false    | Frequently asked questions that are relevant to the search query.                |
| infobox     | [GraphInfobox](https://api-dashboard.search.brave.com/app/documentation/web-search/#GraphInfobox)         | false    | Aggregated information on an entity showable as an infobox.                      |
| locations   | [Locations](https://api-dashboard.search.brave.com/app/documentation/web-search/#Locations)               | false    | Places of interest (POIs) relevant to location sensitive queries.                |
| mixed       | [MixedResponse](https://api-dashboard.search.brave.com/app/documentation/web-search/#MixedResponse)       | false    | Preferred ranked order of search results.                                        |
| news        | [News](https://api-dashboard.search.brave.com/app/documentation/web-search/#News)                         | false    | News results relevant to the query.                                              |
| query       | [Query](https://api-dashboard.search.brave.com/app/documentation/web-search/#Query)                       | false    | Search query string and its modifications that are used for search.              |
| videos      | [Videos](https://api-dashboard.search.brave.com/app/documentation/web-search/#Videos)                     | false    | Videos relevant to the query.                                                    |
| web         | [Search](https://api-dashboard.search.brave.com/app/documentation/web-search/#Search)                     | false    | Web search results relevant to the query.                                        |
| summarizer  | [Summarizer](https://api-dashboard.search.brave.com/app/documentation/web-search/#Summarizer)             | false    | Summary key to get summary results for the query.                                |
| rich        | [RichCallbackInfo](https://api-dashboard.search.brave.com/app/documentation/web-search/#RichCallbackInfo) | false    | Callback information for rich results.                                           |

#### [#](https://api-dashboard.search.brave.com/app/documentation/web-search/#Search) Search

A model representing a collection of web search results.

| Field           | Type                                                                                                         | Required | Description                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------- |
| type            | "search"                                                                                                     | true     | A type identifying web search results. The value is always `search`. |
| results         | list \[ [SearchResult](https://api-dashboard.search.brave.com/app/documentation/web-search/#SearchResult) \] | true     | A list of search results.                                            |
| family_friendly | bool                                                                                                         | true     | Whether the results are family friendly.                             |

#### [#](https://api-dashboard.search.brave.com/app/documentation/web-search/#Query) Query

A model representing information gathered around the requested query.

| Field                  | Type                                                                                      | Required | Description                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| original               | string                                                                                    | true     | The original query that was requested.                                                                |
| show_strict_warning    | bool                                                                                      | false    | Whether there is more content available for query, but the response was restricted due to safesearch. |
| altered                | string                                                                                    | false    | The altered query for which the search was performed.                                                 |
| safesearch             | bool                                                                                      | false    | Whether safesearch was enabled.                                                                       |
| is_navigational        | bool                                                                                      | false    | Whether the query is a navigational query to a domain.                                                |
| is_geolocal            | bool                                                                                      | false    | Whether the query has location relevance.                                                             |
| local_decision         | string                                                                                    | false    | Whether the query was decided to be location sensitive.                                               |
| local_locations_idx    | int                                                                                       | false    | The index of the location.                                                                            |
| is_trending            | bool                                                                                      | false    | Whether the query is trending.                                                                        |
| is_news_breaking       | bool                                                                                      | false    | Whether the query has news breaking articles relevant to it.                                          |
| ask_for_location       | bool                                                                                      | false    | Whether the query requires location information for better results.                                   |
| language               | [Language](https://api-dashboard.search.brave.com/app/documentation/web-search/#Language) | false    | The language information gathered from the query.                                                     |
| spellcheck_off         | bool                                                                                      | false    | Whether the spellchecker was off.                                                                     |
| country                | string                                                                                    | false    | The country that was used.                                                                            |
| bad_results            | bool                                                                                      | false    | Whether there are bad results for the query.                                                          |
| should_fallback        | bool                                                                                      | false    | Whether the query should use a fallback.                                                              |
| lat                    | string                                                                                    | false    | The gathered location latitutde associated with the query.                                            |
| long                   | string                                                                                    | false    | The gathered location longitude associated with the query.                                            |
| postal_code            | string                                                                                    | false    | The gathered postal code associated with the query.                                                   |
| city                   | string                                                                                    | false    | The gathered city associated with the query.                                                          |
| state                  | string                                                                                    | false    | The gathered state associated with the query.                                                         |
| header_country         | string                                                                                    | false    | The country for the request origination.                                                              |
| more_results_available | bool                                                                                      | false    | Whether more results are available for the given query.                                               |
| custom_location_label  | string                                                                                    | false    | Any custom location labels attached to the query.                                                     |
| reddit_cluster         | string                                                                                    | false    | Any reddit cluster associated with the query.                                                         |
