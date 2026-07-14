# Обновление Dandy’s Progress до v12

## 1. Supabase — бейджи

Сначала убедись, что миграция v11 уже выполнена. Затем:

1. Открой **Supabase → SQL Editor → New query**.
2. Открой `supabase-badges-v12.sql`.
3. Скопируй весь файл, вставь и нажми **Run**.

## 2. Назначь себя администратором

1. Открой **Authentication → Users**.
2. Найди свой аккаунт и скопируй значение **User UID**.
3. Вернись в **SQL Editor → New query**.
4. Запусти строку, заменив значение внутри кавычек:

```sql
insert into public.site_admins (user_id)
values ('ТВОЙ-USER-UID')
on conflict (user_id) do nothing;
```

После повторного входа в аккаунт появится кнопка **«Управление бейджами»**.

## 3. Cloudflare

1. Распакуй v12.
2. Замени `supabase-config.js` своим рабочим файлом.
3. Загрузи все файлы новым развёртыванием.

Особенно проверь наличие:

- `badges.js`;
- `favicon.ico`;
- `favicon-32.png`;
- `favicon-192.png`;
- `favicon-512.png`;
- `apple-touch-icon.png`;
- `site.webmanifest`.

## 4. GitHub Pages

1. **Add file → Upload files**.
2. Загрузи все новые файлы, кроме уже настроенного `supabase-config.js`.
3. Commit message: `Обновление до v12: favicon и бейджи`.
4. Нажми **Commit changes**.

## 5. Проверка

1. Выполни выход и вход в свой аккаунт.
2. Открой окно аккаунта.
3. Нажми **«Управление бейджами»**.
4. Выбери игрока, введи название и эмодзи, нажми **«Выдать бейдж»**.
5. Открой публичный профиль игрока.
6. Для favicon используй `Ctrl + F5` или приватное окно: браузеры часто кэшируют старую иконку.
