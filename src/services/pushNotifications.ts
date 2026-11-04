import { CustomerPushEvent } from '../types';
import { api } from './api';

const PUSH_PREFS_STORAGE_KEY = 'ips_customer_sw_push_prefs_v1';

export interface LocalPushSubscriptionPrefs {
  deviceId: string;
  enabled: boolean;
  subscribedToOffers: boolean;
  subscribedToOrders: boolean;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  trackedOrderIds: string[];
  deliveredEventIds: string[];
  lastCheckedAt: string;
}

function generateDeviceId(): string {
  return `ips_dev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function getLocalPushPrefs(): LocalPushSubscriptionPrefs {
  try {
    const raw = localStorage.getItem(PUSH_PREFS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        deviceId: parsed.deviceId || generateDeviceId(),
        enabled: Boolean(parsed.enabled),
        subscribedToOffers: parsed.subscribedToOffers !== false,
        subscribedToOrders: parsed.subscribedToOrders !== false,
        customerEmail: String(parsed.customerEmail || '').trim(),
        customerName: String(parsed.customerName || '').trim(),
        customerPhone: String(parsed.customerPhone || '').trim(),
        trackedOrderIds: Array.isArray(parsed.trackedOrderIds) ? parsed.trackedOrderIds : ['PED-2026-002'],
        deliveredEventIds: Array.isArray(parsed.deliveredEventIds)
          ? parsed.deliveredEventIds
          : ['push_seed_offer_1', 'push_seed_order_1'],
        lastCheckedAt: parsed.lastCheckedAt || new Date(Date.now() - 60000).toISOString()
      };
    }
  } catch {
    // ignore storage errors
  }

  return {
    deviceId: generateDeviceId(),
    enabled: false,
    subscribedToOffers: true,
    subscribedToOrders: true,
    customerEmail: '',
    customerName: '',
    customerPhone: '',
    trackedOrderIds: ['PED-2026-002'],
    deliveredEventIds: ['push_seed_offer_1', 'push_seed_order_1'],
    lastCheckedAt: new Date(Date.now() - 60000).toISOString()
  };
}

export function saveLocalPushPrefs(
  updates: Partial<LocalPushSubscriptionPrefs>
): LocalPushSubscriptionPrefs {
  const current = getLocalPushPrefs();
  const merged: LocalPushSubscriptionPrefs = {
    ...current,
    ...updates,
    trackedOrderIds: Array.from(
      new Set(
        (updates.trackedOrderIds ?? current.trackedOrderIds)
          .map(id => String(id || '').toUpperCase().trim())
          .filter(Boolean)
      )
    ),
    deliveredEventIds: Array.from(
      new Set(updates.deliveredEventIds ?? current.deliveredEventIds)
    ).slice(-120)
  };
  try {
    localStorage.setItem(PUSH_PREFS_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }
  return merged;
}

export function isServiceWorkerPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window
  );
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isServiceWorkerPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function ensureServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    let reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js');
    }
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn('Service Worker registration check notice:', err);
    return null;
  }
}

/**
 * Requests browser Notification permission and registers/updates the subscription on the server
 */
export async function enableCustomerServiceWorkerPush(options?: {
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  subscribedToOffers?: boolean;
  subscribedToOrders?: boolean;
  trackedOrderIds?: string[];
}): Promise<{
  granted: boolean;
  permission: NotificationPermission | 'unsupported';
  prefs: LocalPushSubscriptionPrefs;
  message: string;
}> {
  if (!isServiceWorkerPushSupported()) {
    return {
      granted: false,
      permission: 'unsupported',
      prefs: getLocalPushPrefs(),
      message: 'Tu navegador actual no soporta la API de Notificaciones del Service Worker.'
    };
  }

  await ensureServiceWorkerRegistration();

  let permission = Notification.permission;
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch {
      // Fallback for older browsers
      permission = await new Promise<NotificationPermission>(resolve => {
        Notification.requestPermission(res => resolve(res));
      });
    }
  }

  const current = getLocalPushPrefs();
  const isGranted = permission === 'granted';

  const updatedPrefs = saveLocalPushPrefs({
    enabled: isGranted,
    customerEmail: options?.customerEmail ?? current.customerEmail,
    customerName: options?.customerName ?? current.customerName,
    customerPhone: options?.customerPhone ?? current.customerPhone,
    subscribedToOffers: options?.subscribedToOffers ?? current.subscribedToOffers,
    subscribedToOrders: options?.subscribedToOrders ?? current.subscribedToOrders,
    trackedOrderIds: options?.trackedOrderIds ?? current.trackedOrderIds
  });

  try {
    await api.saveCustomerPushSubscription({
      deviceId: updatedPrefs.deviceId,
      customerEmail: updatedPrefs.customerEmail || undefined,
      customerName: updatedPrefs.customerName || undefined,
      customerPhone: updatedPrefs.customerPhone || undefined,
      subscribedToOffers: updatedPrefs.subscribedToOffers,
      subscribedToOrders: updatedPrefs.subscribedToOrders,
      trackedOrderIds: updatedPrefs.trackedOrderIds,
      active: isGranted
    });
  } catch (err) {
    console.warn('Could not sync push subscription with backend:', err);
  }

  if (!isGranted) {
    return {
      granted: false,
      permission,
      prefs: updatedPrefs,
      message:
        permission === 'denied'
          ? 'El permiso de notificaciones está bloqueado en el navegador. Habilítalo en el ícono del candado de la barra de direcciones o usa la vista previa en pantalla.'
          : 'Permiso de notificaciones pendiente de confirmación.'
    };
  }

  return {
    granted: true,
    permission,
    prefs: updatedPrefs,
    message: '¡Notificaciones Push del Service Worker activadas para ofertas y estados de pedidos!'
  };
}

/**
 * Dispatches a push notification through the active Service Worker (`registration.showNotification` or SW postMessage)
 */
export async function dispatchServiceWorkerNotification(
  event: Partial<CustomerPushEvent> & { title: string; body: string }
): Promise<boolean> {
  const payload: CustomerPushEvent = {
    id: event.id || `local_push_${Date.now()}`,
    type: event.type || 'NEW_OFFER',
    title: event.title,
    body: event.body,
    tag: event.tag || event.id || `tag_${Date.now()}`,
    url: event.url || '/?promo=active',
    icon: event.icon || '/pwa-192x192.png',
    targetAudience: event.targetAudience || 'all_customers',
    targetOrderId: event.targetOrderId,
    relatedProductRef: event.relatedProductRef,
    relatedCategory: event.relatedCategory,
    orderStatus: event.orderStatus,
    trackingNumber: event.trackingNumber,
    carrier: event.carrier,
    catalogPublished: true,
    createdAt: event.createdAt || new Date().toISOString(),
    createdBy: event.createdBy || 'Service Worker IPS TECNOLÓGICA'
  };

  // Mark as delivered locally so polling won't repeat it
  const prefs = getLocalPushPrefs();
  if (!prefs.deliveredEventIds.includes(payload.id)) {
    saveLocalPushPrefs({
      deliveredEventIds: [...prefs.deliveredEventIds, payload.id]
    });
  }

  if (!isServiceWorkerPushSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const reg = await ensureServiceWorkerRegistration();
    if (reg) {
      if (reg.active) {
        reg.active.postMessage({
          type: 'SHOW_PUSH_NOTIFICATION',
          payload
        });
        return true;
      }
      await reg.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: payload.tag,
        data: {
          id: payload.id,
          type: payload.type,
          url: payload.url,
          targetOrderId: payload.targetOrderId,
          relatedProductRef: payload.relatedProductRef,
          relatedCategory: payload.relatedCategory,
          orderStatus: payload.orderStatus,
          trackingNumber: payload.trackingNumber
        }
      });
      return true;
    }
  } catch (err) {
    console.warn('Service Worker showNotification fallback notice:', err);
  }

  try {
    new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/pwa-192x192.png',
      tag: payload.tag
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Automatically associates a customer's order ID and email with their Service Worker Push subscription
 */
export async function trackCustomerOrderForPush(
  orderId: string,
  customerEmail?: string,
  customerName?: string,
  customerPhone?: string
): Promise<LocalPushSubscriptionPrefs> {
  const current = getLocalPushPrefs();
  const cleanOrderId = String(orderId || '').toUpperCase().trim();
  const nextOrders = cleanOrderId
    ? Array.from(new Set([cleanOrderId, ...current.trackedOrderIds]))
    : current.trackedOrderIds;

  const updated = saveLocalPushPrefs({
    customerEmail: customerEmail || current.customerEmail,
    customerName: customerName || current.customerName,
    customerPhone: customerPhone || current.customerPhone,
    trackedOrderIds: nextOrders
  });

  try {
    await api.saveCustomerPushSubscription({
      deviceId: updated.deviceId,
      customerEmail: updated.customerEmail || undefined,
      customerName: updated.customerName || undefined,
      customerPhone: updated.customerPhone || undefined,
      subscribedToOffers: updated.subscribedToOffers,
      subscribedToOrders: updated.subscribedToOrders,
      trackedOrderIds: updated.trackedOrderIds,
      active: updated.enabled
    });
  } catch {
    // ignore
  }

  return updated;
}

/**
 * Checks `/api/push/events` (and delegates to `/sw.js`) for any new offers or order status changes
 * when the catalog is published, triggering native Service Worker notifications for unseen events.
 */
export async function checkAndDeliverPendingPushEvents(options?: {
  userEmail?: string;
  onInAppToast?: (event: CustomerPushEvent) => void;
}): Promise<{
  catalogPublished: boolean;
  events: CustomerPushEvent[];
  newlyDelivered: CustomerPushEvent[];
}> {
  const prefs = getLocalPushPrefs();
  const effectiveEmail = options?.userEmail || prefs.customerEmail || '';

  try {
    const res = await api.getCustomerPushEvents({
      email: effectiveEmail || undefined,
      orderIds: prefs.trackedOrderIds,
      includeOffers: prefs.subscribedToOffers,
      includeOrders: prefs.subscribedToOrders
    });

    if (!res.catalogPublished) {
      return { catalogPublished: false, events: [], newlyDelivered: [] };
    }

    const deliveredSet = new Set(prefs.deliveredEventIds);
    const newlyDelivered: CustomerPushEvent[] = [];

    // Check events created after the user's last check or not yet in deliveredSet
    const unseen = (res.events || []).filter(ev => !deliveredSet.has(ev.id));

    if (unseen.length > 0) {
      // Deliver up to 2 newest unseen events to avoid notification flooding
      const toDeliver = unseen.slice(0, 2).reverse();
      for (const ev of toDeliver) {
        deliveredSet.add(ev.id);
        newlyDelivered.push(ev);

        if (prefs.enabled) {
          await dispatchServiceWorkerNotification(ev);
          if (options?.onInAppToast) {
            options.onInAppToast(ev);
          }
        }
      }

      // Mark any older unseen events as seen so we only notify once
      unseen.forEach(ev => deliveredSet.add(ev.id));
      saveLocalPushPrefs({
        deliveredEventIds: Array.from(deliveredSet),
        lastCheckedAt: new Date().toISOString()
      });
    }

    return {
      catalogPublished: res.catalogPublished,
      events: res.events || [],
      newlyDelivered
    };
  } catch {
    return { catalogPublished: true, events: [], newlyDelivered: [] };
  }
}
