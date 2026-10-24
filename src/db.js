// Banco SQLite local usando o módulo nativo do Node (node:sqlite) —
// sem compilação, funciona em qualquer PC com Node 22+. Arquivo em data/plantoes.db.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(path.join(dir, 'plantoes.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    duracao_horas REAL NOT NULL,
    inicio TEXT NOT NULL,
    fim TEXT NOT NULL,
    local TEXT DEFAULT '',
    observacao TEXT DEFAULT '',
    texto_original TEXT DEFAULT '',
    google_event_id TEXT DEFAULT '',
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS sent_reminders (
    shift_id INTEGER NOT NULL,
    janela_min INTEGER NOT NULL,
    canal TEXT NOT NULL,
    enviado_em TEXT DEFAULT (datetime('now','localtime')),
    PRIMARY KEY (shift_id, janela_min, canal)
  );
`);

const Shift = {
  all(fromISO = null) {
    return fromISO
      ? db.prepare('SELECT * FROM shifts WHERE fim >= ? ORDER BY inicio').all(fromISO)
      : db.prepare('SELECT * FROM shifts ORDER BY inicio').all();
  },
  get(id) { return db.prepare('SELECT * FROM shifts WHERE id = ?').get(id); },
  create(s) {
    const r = db.prepare(`
      INSERT INTO shifts (tipo, duracao_horas, inicio, fim, local, observacao, texto_original, google_event_id)
      VALUES (?,?,?,?,?,?,?,?)
    `).run(s.tipo, s.duracao_horas, s.inicio, s.fim, s.local || '', s.observacao || '', s.texto_original || '', s.google_event_id || '');
    return Shift.get(Number(r.lastInsertRowid));
  },
  update(id, patch) {
    const cur = Shift.get(id);
    if (!cur) return null;
    const n = { ...cur, ...patch };
    db.prepare(`
      UPDATE shifts SET tipo=?, duracao_horas=?, inicio=?, fim=?, local=?, observacao=?, google_event_id=? WHERE id=?
    `).run(n.tipo, n.duracao_horas, n.inicio, n.fim, n.local, n.observacao, n.google_event_id, id);
    return Shift.get(id);
  },
  remove(id) {
    const cur = Shift.get(id);
    db.prepare('DELETE FROM shifts WHERE id = ?').run(id);
    db.prepare('DELETE FROM sent_reminders WHERE shift_id = ?').run(id);
    return cur;
  },
  reminderSent(shiftId, janelaMin, canal = 'whatsapp') {
    return !!db.prepare(
      'SELECT 1 FROM sent_reminders WHERE shift_id=? AND janela_min=? AND canal=?'
    ).get(shiftId, janelaMin, canal);
  },
  markReminderSent(shiftId, janelaMin, canal = 'whatsapp') {
    db.prepare(
      'INSERT OR IGNORE INTO sent_reminders (shift_id, janela_min, canal) VALUES (?,?,?)'
    ).run(shiftId, janelaMin, canal);
  },
};

module.exports = { db, Shift };
