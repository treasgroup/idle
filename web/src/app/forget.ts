// «Удалить все мои данные», the parts that live on the server apart from the account: the tables of «Стол в
// складчину» this person organised (with their guests' answers) and this browser's subscription to notices.
// (The account itself, its family document and the family's speakers — server: account.delete.)
import { apiUrl } from "../engine";
import { guestSecret, knownParties, partyCall } from "./party";

export async function forgetElsewhere(): Promise<void> {
  const guest = guestSecret();
  await Promise.all(knownParties().filter((k) => k.admin).map((k) =>
    partyCall("party.act", { token: k.token, guest, admin: k.admin, act: "delete" }).catch(() => {})));
  try {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await fetch(apiUrl("push.unsubscribe"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }), credentials: "same-origin" }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  } catch { /* no notices in this browser */ }
}
