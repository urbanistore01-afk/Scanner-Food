export const NOTIFICATIONS_ENABLED_KEY = "notifications_enabled";
export const LAST_NOTIFICATION_TIME_KEY = "last_notification_time";
export const LAST_APP_USE_KEY = "last_app_use_time";

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    alert("Este navegador não suporta notificações.");
    return false;
  }

  if (Notification.permission === "granted") {
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "true");
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "true");
      return true;
    }
  }

  alert("Ative as notificações nas configurações do navegador");
  localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");
  return false;
}

export function sendNotification(title: string, body: string) {
  const isEnabled = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === "true";
  
  if (isEnabled && "Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/logo.png"
    });
    localStorage.setItem(LAST_NOTIFICATION_TIME_KEY, Date.now().toString());
  }
}

export function checkAndSendSmartNotifications(hasRecentScan: boolean = false) {
  const isEnabled = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === "true";
  if (!isEnabled || !("Notification" in window) || Notification.permission !== "granted") return;

  const lastNotificationTime = parseInt(localStorage.getItem(LAST_NOTIFICATION_TIME_KEY) || "0");
  const now = Date.now();
  const hoursSinceLastNotif = (now - lastNotificationTime) / (1000 * 60 * 60);

  // Max 1-2 per day -> Let's say minimum 12 hours between notifications
  if (hoursSinceLastNotif < 12) return;

  if (hasRecentScan) {
    sendNotification("Scanner Food", "Descubra uma alternativa mais saudável para sua última refeição 🥗");
  } else {
    const lastUseTime = parseInt(localStorage.getItem(LAST_APP_USE_KEY) || "0");
    const hoursSinceLastUse = (now - lastUseTime) / (1000 * 60 * 60);

    if (hoursSinceLastUse > 24) {
      sendNotification("Scanner Food", "Já analisou sua alimentação hoje? 🍎");
    } else {
      // Random tip
      const tips = [
        "Evite excesso de açúcar no dia a dia 🍎",
        "Beba bastante água hoje! 💧",
        "Que tal adicionar mais cores ao seu prato? 🥗"
      ];
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      sendNotification("Scanner Food", randomTip);
    }
  }
}

export function updateLastUseTime() {
  localStorage.setItem(LAST_APP_USE_KEY, Date.now().toString());
}
