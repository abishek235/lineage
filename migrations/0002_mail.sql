create table if not exists app_admin (
  user_id text primary key
);

create table if not exists smtp_config (
  id text primary key,
  host text not null default '',
  port integer not null default 587,
  secure boolean not null default false,
  username text not null default '',
  password text not null default '',
  from_address text not null default ''
);

insert into smtp_config (id) values ('default') on conflict (id) do nothing;

create table if not exists reminder_pref (
  user_id text primary key,
  enabled boolean not null default false,
  email text not null default '',
  lead_days integer not null default 7,
  send_time text not null default '08:00',
  timezone text not null default 'Asia/Kolkata',
  last_sent_on text
);
