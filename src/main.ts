const SW_FILE = "/comfyui-ghpages/src/sw.ts";

async function register() {
  try {
    const registration = await navigator.serviceWorker.register(SW_FILE, {
      scope: "/comfyui-ghpages/",
      type: "module",
    });
    console.log("Register Service Worker: Success");
    return registration;
  } catch (error) {
    console.log("Register Service Worker: Error");
    console.error(error);
    return null;
  }
}

async function start() {
  const hasReloaded = sessionStorage.getItem("sw-reloaded");

  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    await registration.unregister();
    console.log("Unregistered existing Service Worker");
  }

  await register();

  if (!navigator.serviceWorker.controller && !hasReloaded) {
    sessionStorage.setItem("sw-reloaded", "true");
    window.location.reload();
    return;
  }
}

if ("serviceWorker" in navigator) {
  start();
}
