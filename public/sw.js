const CACHE_NAME = 'ips-tecnologica-pwa-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/pwa-192x192.png',
  '/pwa-maskable-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/uploads/ips_official_logo.svg'
];

// Private, sensitive, or real-time push endpoints that must NEVER be cached
const NEVER_CACHE_PREFIXES = [
  '/api/auth',
  '/api/users',
  '/api/admin',
  '/api/workspace',
  '/api/backup',
  '/api/restore',
  '/api/reset-defaults',
  '/api/upload',
  '/api/app-config/upload-apk',
  '/api/push'
];

// Track delivered push event IDs inside Service Worker memory to prevent duplicate alerts
const deliveredSwEventIds = new Set();

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(oldKey => caches.delete(oldKey))
        )
      )
      .then(() => self.clients.claim())
  );
});

/**
 * Helper to build and display a native system notification via ServiceWorkerRegistration.showNotification
 */
async function displayCatalogPushNotification(payload) {
  if (!payload || !payload.title) return false;

  const eventId = payload.id || `sw_push_${Date.now()}`;
  if (payload.id && deliveredSwEventIds.has(payload.id)) {
    return false;
  }
  if (payload.id) {
    deliveredSwEventIds.add(payload.id);
  }

  const isOrderEvent =
    payload.type === 'ORDER_STATUS' || payload.type === 'SHIPMENT_UPDATE';

  const targetUrl =
    payload.url ||
    (isOrderEvent
      ? `/?tab=my-account&order=${encodeURIComponent(payload.targetOrderId || '')}`
      : payload.relatedProductRef
      ? `/?product=${encodeURIComponent(payload.relatedProductRef)}`
      : payload.relatedCategory
      ? `/?category=${encodeURIComponent(payload.relatedCategory)}`
      : '/?promo=active');

  const notificationOptions = {
    body: payload.body || 'Tienes una nueva actualización en el catálogo oficial de IPS TECNOLÓGICA.',
    icon: payload.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.tag || eventId,
    renotify: true,
    vibrate: [180, 80, 220],
    data: {
      id: eventId,
      type: payload.type || 'NEW_OFFER',
      url: targetUrl,
      targetOrderId: payload.targetOrderId || null,
      relatedProductRef: payload.relatedProductRef || null,
      relatedCategory: payload.relatedCategory || null,
      orderStatus: payload.orderStatus || null,
      trackingNumber: payload.trackingNumber || null,
      timestamp: payload.createdAt || new Date().toISOString()
    },
    actions: isOrderEvent
      ? [
          { action: 'open', title: 'Ver Estado del Pedido' },
          { action: 'close', title: 'Cerrar' }
        ]
      : [
          { action: 'open', title: 'Ver Oferta en Catálogo' },
          { action: 'close', title: 'Cerrar' }
        ]
  };

  await self.registration.showNotification(payload.title, notificationOptions);

  // Notify open client tabs that a Service Worker Push Notification was displayed
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });
  for (const client of windowClients) {
    client.postMessage({
      type: 'SW_PUSH_DELIVERED',
      payload: {
        ...payload,
        id: eventId,
        url: targetUrl
      }
    });
  }
  return true;
}

/**
 * Standard Web Push API event listener ('push')
 */
self.addEventListener('push', event => {
  let payload = {
    id: `webpush_${Date.now()}`,
    type: 'NEW_OFFER',
    title: 'IPS TECNOLÓGICA — Catálogo Oficial',
    body: 'Nueva oferta o actualización de pedido disponible en el catálogo.',
    url: '/?promo=active'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  event.waitUntil(displayCatalogPushNotification(payload));
});

/**
 * Service Worker Message API listener ('message')
 * Allows the application or background sync to trigger Service Worker notifications
 * and synchronize customer push events from /api/push/events when the catalog is published.
 */
self.addEventListener('message', event => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SHOW_PUSH_NOTIFICATION' && data.payload) {
    event.waitUntil(displayCatalogPushNotification(data.payload));
    return;
  }

  if (data.type === 'SYNC_CUSTOMER_PUSH_EVENTS') {
    const {
      since,
      email,
      orderIds,
      includeOffers = true,
      includeOrders = true,
      knownEventIds = []
    } = data.payload || {};

    if (Array.isArray(knownEventIds)) {
      knownEventIds.forEach(id => deliveredSwEventIds.add(id));
    }

    const params = new URLSearchParams();
    if (since) params.set('since', String(since));
    if (email) params.set('email', String(email));
    if (Array.isArray(orderIds) && orderIds.length > 0) {
      params.set('orderIds', orderIds.join(','));
    }
    params.set('includeOffers', String(Boolean(includeOffers)));
    params.set('includeOrders', String(Boolean(includeOrders)));

    event.waitUntil(
      fetch(`/api/push/events?${params.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })
        .then(res => (res.ok ? res.json() : null))
        .then(async result => {
          if (!result || !result.catalogPublished || !Array.isArray(result.events)) {
            return;
          }
          // Display newest unseen events (chronological order)
          const unseen = result.events
            .filter(ev => ev && ev.id && !deliveredSwEventIds.has(ev.id))
            .slice(0, 3)
            .reverse();

          for (const ev of unseen) {
            await displayCatalogPushNotification(ev);
          }
        })
        .catch(() => {
          // Silent ignore when offline
        })
    );
  }
});

/**
 * Notification click handler ('notificationclick')
 * Focuses an existing catalog window or opens a new one at the target offer/order URL.
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.postMessage({
              type: 'PUSH_NOTIFICATION_CLICKED',
              data: notifData
            });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache authenticated requests, private admin endpoints, or live push event feeds
  if (
    request.headers.get('Authorization') ||
    NEVER_CACHE_PREFIXES.some(prefix => url.pathname.startsWith(prefix))
  ) {
    return;
  }

  // Network-first for public catalog data so prices and active promotions are always fresh when online
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Stale-while-revalidate for static assets & images
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached || caches.match('/index.html'));

      return cached || networkFetch;
    })
  );
});
