import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { isSendTime, isValidTimeZone, minutesOf, zonedNow } from "@/lib/family/mail";

export interface ReminderPrefs {
  enabled: boolean;
  email: string;
  leadDays: number;
  sendTime: string;
  timezone: string;
  lastSentOn: string;
  isAdmin: boolean;
}

export interface SmtpPublic {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  from: string;
  passwordSet: boolean;
}

interface SmtpRow {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from_address: string;
}

interface PrefRow {
  enabled: boolean;
  email: string;
  lead_days: number;
  send_time: string;
  timezone: string;
  last_sent_on: string | null;
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function publicError(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  if (code === "EAUTH" || code === "EAUTHFAIL") return "The mailbox rejected that username or password.";
  if (code === "ENOTFOUND" || code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ESOCKET") {
    return "Could not reach that mail server.";
  }
  return "The message could not be sent.";
}

async function database() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

async function ensureAdmin(userId: string): Promise<boolean> {
  const sql = await database();
  await sql`insert into app_admin (user_id) select ${userId} where not exists (select 1 from app_admin)`;
  const rows = await sql<{ user_id: string }>`select user_id from app_admin where user_id = ${userId}`;
  return rows.length > 0;
}

async function accountEmail(userId: string): Promise<string> {
  const sql = await database();
  const rows = await sql<{ email: string }>`select email from "user" where id = ${userId}`;
  return rows[0]?.email ?? "";
}

async function readPrefs(userId: string): Promise<PrefRow> {
  const sql = await database();
  const rows = await sql<PrefRow>`select enabled, email, lead_days, send_time, timezone, last_sent_on from reminder_pref where user_id = ${userId}`;
  if (rows[0]) return rows[0];
  const email = await accountEmail(userId);
  await sql`insert into reminder_pref (user_id, email) values (${userId}, ${email}) on conflict (user_id) do nothing`;
  const created = await sql<PrefRow>`select enabled, email, lead_days, send_time, timezone, last_sent_on from reminder_pref where user_id = ${userId}`;
  return created[0];
}

async function readSmtp(): Promise<SmtpRow | undefined> {
  const sql = await database();
  const rows = await sql<SmtpRow>`select host, port, secure, username, password, from_address from smtp_config where id = 'default'`;
  return rows[0];
}

function smtpProblem(row: SmtpRow | undefined): string | null {
  if (!row?.host || !row.username || !row.password) return "An admin still needs to set up the mail server.";
  return null;
}

async function deliver(row: SmtpRow, to: string, subject: string, text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const loaded = (await import("nodemailer")) as {
      createTransport?: (options: object) => { sendMail: (message: object) => Promise<unknown> };
      default?: { createTransport: (options: object) => { sendMail: (message: object) => Promise<unknown> } };
    };
    const createTransport = loaded.createTransport ?? loaded.default?.createTransport;
    if (!createTransport) return { ok: false, error: "The message could not be sent." };
    const transport = createTransport({
      host: row.host,
      port: Number(row.port) || 587,
      secure: row.secure === true,
      auth: { user: row.username, pass: row.password },
      connectionTimeout: 12_000,
      greetingTimeout: 12_000,
      socketTimeout: 12_000,
    });
    await transport.sendMail({
      from: row.from_address || row.username,
      to,
      subject,
      text,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: publicError(error) };
  }
}

export const getMyReminder = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ReminderPrefs> => {
    const isAdmin = await ensureAdmin(context.userId);
    const pref = await readPrefs(context.userId);
    return {
      enabled: pref.enabled === true,
      email: pref.email,
      leadDays: Number(pref.lead_days) || 7,
      sendTime: pref.send_time || "08:00",
      timezone: pref.timezone || "Asia/Kolkata",
      lastSentOn: pref.last_sent_on ?? "",
      isAdmin,
    };
  });

export const saveMyReminder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { enabled: boolean; email: string; leadDays: number; sendTime: string; timezone: string }) => input)
  .handler(async ({ context, data }) => {
    const email = clean(data?.email, 120);
    const sendTime = clean(data?.sendTime, 5);
    const timezone = clean(data?.timezone, 80);
    const leadDays = Number(data?.leadDays);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false as const, error: "Enter the address that should receive your reminders." };
    if (!Number.isInteger(leadDays) || leadDays < 0 || leadDays > 60) return { ok: false as const, error: "Look ahead between 0 and 60 days." };
    if (!isSendTime(sendTime)) return { ok: false as const, error: "Choose a time of day." };
    if (!isValidTimeZone(timezone)) return { ok: false as const, error: "That time zone is not recognized." };
    const sql = await database();
    await sql`
      insert into reminder_pref (user_id, enabled, email, lead_days, send_time, timezone)
      values (${context.userId}, ${data.enabled === true}, ${email}, ${leadDays}, ${sendTime}, ${timezone})
      on conflict (user_id) do update set
        enabled = excluded.enabled,
        email = excluded.email,
        lead_days = excluded.lead_days,
        send_time = excluded.send_time,
        timezone = excluded.timezone
    `;
    return { ok: true as const };
  });

export const getSmtpSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: true; smtp: SmtpPublic } | { ok: false; error: string }> => {
    const isAdmin = await ensureAdmin(context.userId);
    if (!isAdmin) return { ok: false, error: "Only an admin can view the mail server." };
    const row = await readSmtp();
    return {
      ok: true,
      smtp: {
        host: row?.host ?? "",
        port: Number(row?.port) || 587,
        secure: row?.secure === true,
        username: row?.username ?? "",
        from: row?.from_address ?? "",
        passwordSet: Boolean(row?.password),
      },
    };
  });

export const saveSmtpSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { host: string; port: number; secure: boolean; username: string; password: string; from: string }) => input)
  .handler(async ({ context, data }) => {
    const isAdmin = await ensureAdmin(context.userId);
    if (!isAdmin) return { ok: false as const, error: "Only an admin can change the mail server." };
    const host = clean(data?.host, 200);
    const username = clean(data?.username, 200);
    const from = clean(data?.from, 200);
    const password = typeof data?.password === "string" ? data.password.slice(0, 200) : "";
    const port = Number(data?.port);
    if (!host) return { ok: false as const, error: "Enter the mail server." };
    if (!Number.isInteger(port) || port < 1 || port > 65535) return { ok: false as const, error: "Enter a port from 1 to 65535." };
    if (!username) return { ok: false as const, error: "Enter the mailbox username." };
    const current = await readSmtp();
    if (!password && !current?.password) return { ok: false as const, error: "Enter the mailbox password." };
    const sql = await database();
    await sql`
      update smtp_config set
        host = ${host},
        port = ${port},
        secure = ${data.secure === true},
        username = ${username},
        from_address = ${from}
      where id = 'default'
    `;
    if (password) await sql`update smtp_config set password = ${password} where id = 'default'`;
    return { ok: true as const };
  });

export const sendFamilyMail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { kind: "test" | "due" | "now"; subject: string; text: string }) => input)
  .handler(async ({ context, data }) => {
    const pref = await readPrefs(context.userId);
    const to = pref.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return { ok: false as const, error: "Save the address that should receive your reminders." };
    }
    const smtp = await readSmtp();
    const problem = smtpProblem(smtp);
    if (problem || !smtp) return { ok: false as const, error: problem ?? "An admin still needs to set up the mail server." };
    const kind = data?.kind === "test" || data?.kind === "now" ? data.kind : "due";
    const zone = zonedNow(pref.timezone || "Asia/Kolkata");
    if (!zone) return { ok: false as const, error: "That time zone is not recognized." };
    if (kind === "due") {
      if (pref.enabled !== true) return { ok: true as const, skipped: "off" as const };
      if (!isSendTime(pref.send_time) || zone.minutes < minutesOf(pref.send_time)) {
        return { ok: true as const, skipped: "early" as const };
      }
      if (pref.last_sent_on === zone.date) return { ok: true as const, skipped: "sent" as const };
    }
    const subject = clean(data?.subject, 140) || (kind === "test" ? "Lineage test" : "Lineage reminder");
    const text = clean(data?.text, 8000) || (kind === "test" ? "This is a test from your family record." : "");
    if (!text) return { ok: false as const, error: "Nothing is due to send." };
    const result = await deliver(smtp, to, subject, text);
    if (!result.ok) return result;
    if (kind !== "test") {
      const sql = await database();
      await sql`update reminder_pref set last_sent_on = ${zone.date} where user_id = ${context.userId}`;
    }
    return { ok: true as const, skipped: null };
  });
