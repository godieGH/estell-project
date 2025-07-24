<template>
  <q-page-container>
    <q-page class="row items-center justify-center">
      <q-card flat bordered class="q-pa-lg q-mx-md">
        <div class="column items-center text-center">
          <!-- Big warning icon, with aria-label for accessibility -->
          <q-icon name="warning" color="negative" size="64px" aria-label="Error icon" />

          <!-- Display status code + title -->
          <div class="text-h5 text-negative q-mt-md">Oops – {{ status }} {{ errorTitle }}</div>

          <!-- Smaller subtitle for the message -->
          <div class="text-subtitle1 text-grey-7 q-mt-sm">
            {{ errorMsg }}
          </div>

          <!-- Button back to home -->
          <q-btn class="q-mt-lg" label="Go Home" color="primary" to="/" unelevated />
        </div>
      </q-card>
    </q-page>
  </q-page-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

// Grab the “status” from either params or query, defaulting to "500"
const route = useRoute()
const status = route.params.status || route.query.status || '500'

// Centralized map of known titles
const titlesByStatus = {
  400: 'Bad Request',
  401: 'Invalid or Expired Token',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Payload Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Range Not Satisfiable',
  417: 'Expectation Failed',
  418: "I'm a teapot",
  421: 'Misdirected Request',
  422: 'Unprocessable Entity',
  423: 'Locked',
  424: 'Failed Dependency',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',
  507: 'Insufficient Storage',
  508: 'Loop Detected',
  510: 'Not Extended',
  511: 'Network Authentication Required',
}

// Centralized map of detailed messages
const messagesByStatus = {
  // 4xx Client Error
  400: 'Bad Request: The server could not understand the request due to invalid syntax.',
  401: 'Unauthorized: Authentication is required and has failed or has not yet been provided.',
  402: 'Payment Required: This code is reserved for future use.',
  403: 'Forbidden: You do not have permission to access this resource.',
  404: 'Not Found: The page you requested is not available.',
  405: 'Method Not Allowed: The request method is not supported for this resource.',
  406: 'Not Acceptable: The server cannot produce a response matching the list of acceptable values.',
  407: 'Proxy Authentication Required: Authentication with a proxy is required.',
  408: 'Request Timeout: The server timed out waiting for the request.',
  409: 'Conflict: The request could not be completed due to a conflict with the current state of the resource.',
  410: 'Gone: The requested resource is no longer available and will not be available again.',
  411: 'Length Required: The request did not specify the length of its content.',
  412: 'Precondition Failed: One or more conditions given in the request header fields evaluated to false.',
  413: 'Payload Too Large: The request is larger than the server is willing or able to process.',
  414: 'URI Too Long: The URI provided was too long for the server to process.',
  415: 'Unsupported Media Type: The request entity has a media type which the server or resource does not support.',
  416: 'Range Not Satisfiable: The client has asked for a portion of the file, but the server cannot supply that portion.',
  417: 'Expectation Failed: The server cannot meet the requirements of the Expect request-header field.',
  418: "I'm a teapot: The server refuses to brew coffee because it is a teapot.",
  421: 'Misdirected Request: The request was directed at a server that is not able to produce a response.',
  422: 'Unprocessable Entity: The request was well-formed but was unable to be followed due to semantic errors.',
  423: 'Locked: The resource that is being accessed is locked.',
  424: 'Failed Dependency: The request failed due to failure of a previous request.',
  425: 'Too Early: The server is unwilling to risk processing a request that might be replayed.',
  426: 'Upgrade Required: The client should switch to a different protocol.',
  428: 'Precondition Required: The origin server requires the request to be conditional.',
  429: 'Too Many Requests: Too many requests have been sent in a given amount of time; please try again later.',
  431: 'Request Header Fields Too Large: The server is unwilling to process the request because its header fields are too large.',
  451: 'Unavailable For Legal Reasons: The user requests an illegal resource, such as a web page censored by a government.',
  // 5xx Server Error
  500: 'Internal Server Error: The server encountered an unexpected condition.',
  501: 'Not Implemented: The server does not recognize the request method, or it lacks the ability to fulfill the request.',
  502: 'Bad Gateway: The server was acting as a gateway or proxy and received an invalid response from the upstream server.',
  503: 'Service Unavailable: The server is not ready to handle the request, often due to maintenance or overload.',
  504: 'Gateway Timeout: The server was acting as a gateway or proxy and did not receive a timely response from the upstream server.',
  505: 'HTTP Version Not Supported: The server does not support the HTTP protocol version used in the request.',
  506: 'Variant Also Negotiates: Transparent content negotiation for the request results in a circular reference.',
  507: 'Insufficient Storage: The server is unable to store the representation needed to complete the request.',
  508: 'Loop Detected: The server detected an infinite loop while processing the request.',
  510: 'Not Extended: Further extensions to the request are required for the server to fulfill it.',
  511: 'Network Authentication Required: The client needs to authenticate to gain network access.',
}

// Computed title (falls back to “Unexpected Error” if code not in map)
const errorTitle = computed(() => {
  return titlesByStatus[status] || 'Unexpected Error'
})

// Computed message (falls back to generic if not in map)
const errorMsg = computed(() => {
  return messagesByStatus[status] || 'An unexpected error occurred.'
})
</script>

<style scoped>
/* (Optional) add any extra styling here */
</style>
