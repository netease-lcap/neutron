const cacheableContentTypes = [
  'text/',
  'image/',
  'application/x-font',
  'application/javascript',
];

const isCacheableRequest = (request) => {
  const { method, url } = request;

  if (method !== 'GET') {
    return false;
  }

  if (url?.includes?.('?')) {
    return false;
  }

  return true;
};

const isCacheableResponse = (response) => {
  const { ok, headers } = response;

  const contentType = headers.get('content-type') || '';
  const some = (item) => contentType.startsWith(item);

  return ok && cacheableContentTypes.some(some);
};

const isCacheable = (request, response) => {
  return isCacheableRequest(request) && isCacheableResponse(response);
};

const putInCache = async (request, response) => {
  const cache = await caches.open('neutron-v1');

  await cache.put(request, response);
};

const cacheFirst = async (request, event) => {
  const { url = '' } = request;

  const cacheableRequest = isCacheableRequest(request);

  if (!cacheableRequest) {
    return fetch(request);
  }

  const responseFromCache = await caches.match(request);

  if (responseFromCache) {
    (async () => {
      const responseFromNetwork = await fetch(request);
      const cloned = responseFromNetwork.clone();

      putInCache(request, cloned);
    })();

    return responseFromCache;
  }

  const responseFromNetwork = await fetch(request);
  const cacheable = isCacheable(request, responseFromNetwork);

  if (cacheable) {
    const cloned = responseFromNetwork.clone();
    const putting = putInCache(request, cloned);

    event.waitUntil(putting);
  }

  return responseFromNetwork;
};

self.addEventListener('activate', (event) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  const response = cacheFirst(request, event);

  event.respondWith(response);
});