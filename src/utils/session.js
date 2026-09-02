const SESSION_KEY = "docurag_session_id";

// Every browser tab gets one stable session id, persisted in localStorage so
// it survives reloads. The backend uses this to keep each user's uploaded
// document separate (see server/server.js).
export function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}
