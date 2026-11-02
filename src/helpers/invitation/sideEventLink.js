/*
  Link público de un side event / Pop. Cada evento tiene un código al azar
  (`side_events.public_code`, 10 letras y números) que no se puede adivinar:
  iattend.events/side-event/<código>. Los eventos que ya existían antes de
  este cambio siguen abriendo también con su número (`legacy_link_enabled`,
  para no romper links que ya se mandaron) hasta que el organizador lo
  apague en "Imagen del link". Sin la migración todavía (sin código), se usa
  el número como antes.
  Migración: iattend--backend/migrations/2026-11-01b_side_events_public_code.sql.
  La página que lo resuelve: iattend-events/src/app/side-event/[side_event_id]/page.tsx.
*/
export const codigoSide = (ev) => ev?.public_code || ev?.id

export const urlSide = (ev, base = 'https://www.iattend.events') => `${base}/side-event/${codigoSide(ev)}`
