(() => {
  const STORAGE_KEY = 'dandys-progress-language';
  const saved = localStorage.getItem(STORAGE_KEY);
  let language = saved === 'en' || saved === 'ru'
    ? saved
    : (String(navigator.language || '').toLowerCase().startsWith('ru') ? 'ru' : 'en');

  const exact = {
    'Dandy’s Progress — трекер Dandy’s World': 'Dandy’s Progress — Dandy’s World tracker',
    'Личный трекер': 'Personal tracker',
    'Основная навигация': 'Main navigation',
    'Мой прогресс': 'My progress',
    'Игроки': 'Players',
    'Друзья': 'Friends',
    'Управление бейджами': 'Manage badges',
    'Панель владельца': 'Owner panel',
    'Бейджи профилей': 'Profile badges',
    'Выдавай игрокам уникальные значки': 'Give players unique badges',
    'Укажи игрока, собственное название, эмодзи и описание. Бейдж появится в карточке и публичном профиле.': 'Choose a player, custom name, emoji and description. The badge will appear on their card and public profile.',
    'Игрок': 'Player',
    'Название бейджа': 'Badge name',
    'Например: Первый участник': 'For example: Early member',
    'Значок': 'Icon',
    'Цвет': 'Color',
    'Золотой': 'Gold',
    'Зелёный': 'Green',
    'Голубой': 'Blue',
    'Фиолетовый': 'Purple',
    'Розовый': 'Pink',
    'Красный': 'Red',
    'Тёмный': 'Dark',
    'Описание': 'Description',
    'За что выдан этот бейдж': 'Why this badge was awarded',
    'Выдать бейдж': 'Award badge',
    'Бейджи выбранного игрока': 'Selected player badges',
    'Удалить бейдж может только администратор сайта': 'Only a site administrator can remove a badge',
    'У игрока пока нет бейджей.': 'This player has no badges yet.',
    'Удалить бейдж': 'Remove badge',
    'Бейдж выдан.': 'Badge awarded.',
    'Бейдж удалён.': 'Badge removed.',
    'Введи название бейджа.': 'Enter a badge name.',
    'Выбери игрока.': 'Choose a player.',
    'Укажи значок или эмодзи.': 'Enter an icon or emoji.',
    'Нет доступа к панели бейджей.': 'You do not have access to the badge panel.',
    'Загружаем бейджи…': 'Loading badges…',
    'Не удалось загрузить бейджи': 'Could not load badges',
    'Управлять бейджами': 'Manage badges',
    'Бейджи': 'Badges',
    'Администратор сайта может выдавать и удалять декоративные бейджи с названием, значком и кратким описанием. Бейджи отображаются в карточках и публичных профилях игроков.': 'The site administrator can award and remove decorative badges with a name, icon and short description. Badges are displayed on player cards and public profiles.',
    'Друзья и сообщения': 'Friends and messages',
    'Заявки в друзья, личные сообщения и общение с игроками.': 'Friend requests, direct messages and player conversations.',
    'Непрочитанные сообщения': 'Unread messages',
    'Сначала подключите Supabase': 'Connect Supabase first',
    'Друзья и сообщения используют облачную базу сайта.': 'Friends and messages use the website cloud database.',
    'Войдите в аккаунт': 'Sign in to your account',
    'Друзья и сообщения доступны после входа в Dandy’s Progress.': 'Friends and messages are available after signing in to Dandy’s Progress.',
    'Загружаем друзей…': 'Loading friends…',
    'Не удалось загрузить друзей': 'Could not load friends',
    'Gardenview mail room': 'Gardenview mail room',
    'Добавляй знакомых игроков, принимай заявки и общайся прямо в Dandy’s Progress.': 'Add players you know, accept requests and chat directly in Dandy’s Progress.',
    'друзей': 'friends',
    'заявок': 'requests',
    'новых': 'new',
    'Заявки': 'Requests',
    'Найти игроков': 'Find players',
    'Ваши друзья': 'Your friends',
    'Обновить': 'Refresh',
    'Список друзей пока пуст': 'Your friends list is empty',
    'Найди игрока по нику или открой его публичный профиль.': 'Find a player by username or open their public profile.',
    'Выбери друга': 'Choose a friend',
    'Здесь появится история сообщений.': 'Your message history will appear here.',
    'Удалить': 'Remove',
    'Заблокировать': 'Block',
    'Начните разговор': 'Start a conversation',
    'Напишите первое сообщение. Не отправляйте пароли, email и другие личные данные.': 'Send the first message. Do not share passwords, email addresses or other personal data.',
    'Написать сообщение…': 'Write a message…',
    'Отправить': 'Send',
    'Сообщения видны только участникам переписки, но не имеют сквозного шифрования.': 'Messages are visible only to conversation participants, but are not end-to-end encrypted.',
    'Входящие заявки': 'Incoming requests',
    'Игроки, которые хотят добавить вас': 'Players who want to add you',
    'Принять': 'Accept',
    'Отклонить': 'Decline',
    'Новых заявок нет': 'No new requests',
    'Входящие заявки появятся здесь.': 'Incoming requests will appear here.',
    'Отправленные заявки': 'Sent requests',
    'Ожидают ответа другого игрока': 'Waiting for the other player',
    'Отменить': 'Cancel',
    'Нет отправленных заявок': 'No sent requests',
    'Найдите игрока во вкладке поиска.': 'Find a player in the search tab.',
    'Заблокированные игроки': 'Blocked players',
    'Они не могут отправлять вам заявки и сообщения': 'They cannot send you requests or messages',
    'Разблокировать': 'Unblock',
    'Список заблокированных пуст.': 'The blocked list is empty.',
    'Найти друзей': 'Find friends',
    'В поиске показываются только открытые профили': 'Only public profiles appear in search',
    'Ник или имя игрока…': 'Player username or name…',
    'Ищем игроков…': 'Searching for players…',
    'Подождите несколько секунд.': 'Please wait a few seconds.',
    'Не удалось выполнить поиск': 'Search failed',
    'Введите хотя бы два символа': 'Enter at least two characters',
    'Искать можно по нику или отображаемому имени.': 'You can search by username or display name.',
    'Игроки не найдены': 'No players found',
    'Проверьте ник или попробуйте другую часть имени.': 'Check the username or try another part of the name.',
    'Добавить': 'Add',
    'Заявка отправлена': 'Request sent',
    'Заблокирован': 'Blocked',
    'Добавить в друзья': 'Add friend',
    'Написать сообщение': 'Message',
    'Принять заявку': 'Accept request',
    'Это вы': 'This is you',
    'Заявка уже существует.': 'A request already exists.',
    'Заявка в друзья отправлена': 'Friend request sent',
    'Заявка уже отправлена': 'The request has already been sent',
    'Заблокировать этого игрока? Он не сможет отправлять вам заявки и сообщения.': 'Block this player? They will no longer be able to send you requests or messages.',
    'Удалить этого игрока из друзей? История сообщений останется в базе, но переписка станет недоступна до повторного добавления.': 'Remove this player from your friends? Message history will remain stored, but the chat will be unavailable until you become friends again.',
    'Туны': 'Toons',
    'Твистеды': 'Twisteds',
    'Достижения': 'Achievements',
    'Данные': 'Data',
    'Поддержать': 'Support',
    'Поддержать развитие проекта': 'Support the project',
    'Гостевой прогресс хранится в браузере. После подключения облака — в личном аккаунте.': 'Guest progress is stored in this browser. After cloud setup, it is stored in your account.',
    'Конфиденциальность': 'Privacy',
    'Закрыть меню': 'Close menu',
    'Открыть меню': 'Open menu',
    'Обзор прогресса': 'Progress overview',
    'Вся коллекция, мастерства и исследования в одном месте.': 'Your collection, masteries and research in one place.',
    'Сохранено': 'Saved',
    'Локально': 'Local',
    'Экспорт': 'Export',
    'Мастерство туна': 'Toon mastery',
    'Закрыть': 'Close',
    'Сбросить прогресс': 'Reset progress',
    'Готово': 'Done',
    'Новое достижение': 'New achievement',
    'Добавить свою цель': 'Add a custom goal',
    'Название': 'Name',
    'Например: Первый соло-ран': 'For example: First solo run',
    'Уровень': 'Tier',
    'Личное': 'Personal',
    'Бронза': 'Bronze',
    'Серебро': 'Silver',
    'Золото': 'Gold',
    'Радужное': 'Rainbow',
    'Оникс': 'Onyx',
    'Описание': 'Description',
    'Что нужно сделать': 'What needs to be done',
    'Текущий прогресс': 'Current progress',
    'Цель': 'Goal',
    'Добавить': 'Add',
    'Облачный профиль': 'Cloud profile',
    'Аккаунт Dandy’s Progress': 'Dandy’s Progress account',
    'Облако ещё не подключено': 'Cloud is not connected yet',
    'Сайт работает локально. Для регистрации пользователей создай бесплатный проект Supabase и вставь URL и publishable key в файл supabase-config.js. Подробная инструкция лежит в DEPLOY.md.': 'The site currently works locally. To enable accounts, create a free Supabase project and add its URL and publishable key to supabase-config.js. Detailed instructions are in DEPLOY.md.',
    'Отображаемое имя': 'Display name',
    'Пароль': 'Password',
    'Минимум 6 символов': 'At least 6 characters',
    'При регистрации может потребоваться подтвердить email. После входа прогресс синхронизируется между устройствами.': 'You may need to confirm your email after signing up. Once signed in, progress syncs between devices.',
    'Войти': 'Sign in',
    'Создать аккаунт': 'Create account',
    'Пользователь': 'Player',
    'Прогресс синхронизирован.': 'Progress is synced.',
    'Публичный профиль': 'Public profile',
    'Синхронизировать': 'Sync now',
    'Выйти': 'Sign out',
    'Страница игрока': 'Player page',
    'Настроить публичный профиль': 'Set up public profile',
    'Ник для ссылки': 'Username for the link',
    'Коротко о себе': 'Short bio',
    'Например: фармлю исследования и учусь соло-ранам': 'For example: farming research and learning solo runs',
    'Тун на аватаре': 'Avatar toon',
    'Своя аватарка (ссылка или путь)': 'Custom avatar (URL or path)',
    'Оставь поле пустым, чтобы использовать выбранного туна. Можно указать HTTPS-ссылку или путь к картинке в репозитории GitHub.': 'Leave this field empty to use the selected toon. You can enter an HTTPS URL or a path to an image in the GitHub repository.',
    'Укажи HTTPS-ссылку или путь к картинке внутри сайта.': 'Enter an HTTPS URL or a path to an image inside the website.',
    'Показывать профиль другим игрокам': 'Show profile to other players',
    'В публичный профиль попадают только отметки коллекции, проценты исследований и общая статистика. Email, пароли и личные заметки не публикуются.': 'Only collection marks, research percentages and general statistics are included in the public profile. Email, passwords and private notes are never published.',
    'Скопировать ссылку': 'Copy link',
    'Сохранить профиль': 'Save profile',
    'Профиль игрока': 'Player profile',
    'Игрок': 'Player',

    'Обычный': 'Regular',
    'Главный': 'Main',
    'Ивентовый': 'Event',
    'Главный · Ивент': 'Main · Event',
    'Летальный': 'Lethal',

    'Мой прогресс': 'My progress',
    'Личная коллекция, мастерства и исследования.': 'Your personal collection, masteries and research.',
    'Игроки Gardenview': 'Gardenview players',
    'Публичные профили, рейтинг и сравнение прогресса.': 'Public profiles, rankings and progress comparison.',
    'Отмечай полученных тунов, мастерства и винтажные скины.': 'Track unlocked toons, masteries and vintage skins.',
    'Записывай встречи, проценты исследования и полученные тринкеты.': 'Track encounters, research percentage and unlocked trinkets.',
    'Официальные медали и любые собственные цели.': 'Official medals and your own custom goals.',
    'Данные и резервная копия': 'Data and backup',
    'Экспортируй прогресс, переноси его между устройствами и восстанавливай при необходимости.': 'Export progress, move it between devices and restore it when needed.',
    'Поддержать проект': 'Support the project',
    'Добровольная поддержка развития Dandy’s Progress.': 'Optional support for Dandy’s Progress development.',

    'Твой прогресс': 'Your progress',
    'Собери всех тунов, закрой исследования и не потеряй ни одного счётчика.': 'Collect every toon, complete research and keep every counter in one place.',
    'Личный журнал Gardenview: отмечай коллекцию, мастерства и исследования, а затем делись открытой страницей с друзьями.': 'Your Gardenview journal: track your collection, masteries and research, then share a public page with friends.',
    'Страницы игроков': 'Player pages',
    'Продолжить мастерства': 'Continue masteries',
    'Получено тунов': 'Toons unlocked',
    'Доступные персонажи в коллекции': 'Playable characters in your collection',
    'Мастерства': 'Masteries',
    'Винтажные скины и требования': 'Vintage skins and requirements',
    'Исследовано на 100%': '100% researched',
    'Достижения': 'Achievements',
    'Официальные и личные цели': 'Official and custom goals',
    'Ближайшие мастерства': 'Closest masteries',
    'Туны, у которых уже есть прогресс': 'Toons with mastery progress',
    'Открыть тунов': 'Open toons',
    'готово': 'complete',
    'в процессе': 'in progress',
    'Пока нет начатых мастерств.': 'No masteries have been started yet.',
    'Текущие исследования': 'Current research',
    'Ближе всего к новому тринкету': 'Closest to a new trinket',
    'Открыть': 'Open',
    'Нет незавершённых исследований.': 'No unfinished research.',
    'Общая статистика': 'General statistics',
    'Можно переписывать значения из игрового журнала': 'Enter values from the in-game journal',
    'Максимальный этаж': 'Highest floor',
    'Всего пройдено метров': 'Total distance traveled',
    'Всего завершено машин': 'Total machines completed',
    'Всего поднято предметов': 'Total items picked up',
    'Всего использовано предметов': 'Total items used',
    'Текущий ихор': 'Current Ichor',
    'Заметка': 'Note',
    'Например: коплю на Тиган': 'For example: saving for Teagan',

    'Общий рейтинг': 'Overall score',
    'Закрытые мастерства': 'Completed masteries',
    'Полученные туны': 'Unlocked toons',
    'Полученные тринкеты': 'Unlocked trinkets',
    'Исследования на 100%': '100% research',
    'Выполнено машин': 'Machines completed',
    'Пройдено метров': 'Distance traveled',
    'очков': 'points',
    'мастерств': 'masteries',
    'тунов': 'toons',
    'тринкетов': 'trinkets',
    'исследований': 'research entries',
    'этаж': 'floor',
    'машин': 'machines',
    'метров': 'meters',
    'Публичный профиль': 'Public profile',
    'Игрок пока ничего о себе не написал.': 'This player has not written a bio yet.',
    'получено': 'unlocked',
    'Посмотреть': 'View',
    'Сравнить': 'Compare',
    'Профили': 'Profiles',
    'Топ игроков': 'Leaderboard',
    'Сравнение': 'Comparison',
    'Загружаем страницы игроков…': 'Loading player pages…',
    'Это займёт несколько секунд.': 'This may take a few seconds.',
    'Сначала подключи Supabase': 'Connect Supabase first',
    'Публичные страницы используют ту же бесплатную базу, что и аккаунты. Инструкция находится в DEPLOY.md.': 'Public pages use the same free database as accounts. Instructions are in DEPLOY.md.',
    'Открыть настройки аккаунта': 'Open account settings',
    'Не удалось загрузить игроков': 'Could not load players',
    'Неизвестная ошибка': 'Unknown error',
    'Попробовать снова': 'Try again',
    'Никого не нашли': 'No players found',
    'Пока нет открытых профилей': 'No public profiles yet',
    'Попробуй другой ник или имя.': 'Try another username or display name.',
    'Первым создай публичную страницу и отправь ссылку друзьям.': 'Create the first public page and share it with friends.',
    'Найти игрока по нику или имени…': 'Find a player by username or name…',
    'профиль': 'profile',
    'профилей': 'profiles',
    'Рейтинг пока пуст': 'The leaderboard is empty',
    'Он появится, когда пользователи создадут публичные профили.': 'It will appear when users create public profiles.',
    'Топ профилей': 'Top profiles',
    'Выбери категорию рейтинга. Общий рейтинг является неофициальным и считается внутри трекера.': 'Choose a leaderboard category. The overall score is unofficial and calculated by the tracker.',
    'Категория': 'Category',
    'Как считается общий рейтинг?': 'How is the overall score calculated?',
    'Больше всего очков дают закрытые мастерства, исследования на 100%, тринкеты и полученные туны. Максимальный этаж, машины, метры, достижения и использованные предметы дают дополнительный, но меньший бонус, чтобы огромные вручную введённые числа не перекрывали коллекционный прогресс.': 'Completed masteries, 100% research, trinkets and unlocked toons award the most points. Highest floor, machines, distance, achievements and items used add a smaller bonus so manually entered numbers cannot overshadow collection progress.',
    'Нет': 'None',
    'Нужно хотя бы два профиля': 'At least two profiles are required',
    'Попроси друга создать публичную страницу, после чего вы сможете сравнить прогресс.': 'Ask a friend to create a public page, then you will be able to compare progress.',
    'Первый игрок': 'First player',
    'Поменять игроков местами': 'Swap players',
    'Второй игрок': 'Second player',
    'Тринкеты': 'Trinkets',
    'Использовано предметов': 'Items used',
    'Общие мастерства': 'Shared masteries',
    'Игроки, рейтинги и сравнение': 'Players, rankings and comparison',
    'Открывай страницы друзей, смотри общий рейтинг и сравнивай мастерства, коллекцию, исследования и игровую статистику.': 'Open your friends’ pages, view the overall ranking and compare masteries, collections, research and game statistics.',
    'Моя страница': 'My page',
    'Обновить данные': 'Refresh data',
    'Исследования ещё не отмечены.': 'No research has been marked yet.',
    'тринкет получен': 'trinket unlocked',
    'Неофициальные очки трекера': 'Unofficial tracker points',
    'Макс. этаж': 'Highest floor',
    'Туны с полученным мастерством': 'Toons with completed mastery',
    'Мастерства пока не отмечены.': 'No masteries have been marked yet.',
    'Коллекция игрока': 'Player collection',
    'Полученные туны пока не отмечены.': 'No unlocked toons have been marked yet.',
    'Исследования твистедов': 'Twisted research',
    'Сначала показаны самые заполненные': 'Highest research is shown first',
    'неизвестно': 'unknown',
    'Ссылка на профиль скопирована': 'Profile link copied',
    'Скопируй ссылку:': 'Copy the link:',

    'Получен': 'Unlocked',
    'Мастерство': 'Mastery',
    'Винтаж': 'Vintage',
    'Задания мастерства': 'Mastery tasks',
    'Счётчики': 'Counters',
    'Найти туна...': 'Find a toon…',
    'Все': 'All',
    'Получены': 'Unlocked',
    'В процессе': 'In progress',
    'Ивентовые': 'Event',
    'По этому фильтру ничего не найдено.': 'Nothing matches this filter.',
    'Встречен': 'Encountered',
    'Тринкет': 'Trinket',
    'Тринкет получен': 'Trinket unlocked',
    'Заметка: где встретил, сколько осталось...': 'Note: where you found it, what remains…',
    'Найти твистеда...': 'Find a Twisted…',
    'Встречены': 'Encountered',
    'Летальные': 'Lethal',
    'Найти достижение...': 'Find an achievement…',
    '+ Своя цель': '+ Custom goal',
    'Не выполнены': 'Incomplete',
    'Выполнены': 'Completed',
    'Радужные': 'Rainbow',
    'Личные': 'Personal',
    'Удалить': 'Delete',

    'Резервная копия': 'Backup',
    'Экспорт JSON': 'Export JSON',
    'Скачает весь прогресс одним файлом. Храни его как резервную копию или перенеси на другое устройство.': 'Downloads all progress as one file. Keep it as a backup or move it to another device.',
    'Скачать данные': 'Download data',
    'Импорт JSON': 'Import JSON',
    'Заменит текущий прогресс данными из ранее скачанного файла.': 'Replaces current progress with data from a previously downloaded file.',
    'Выбрать файл': 'Choose file',
    'Полный сброс': 'Full reset',
    'Удалит все изменения и вернёт первоначальные значения, включая предзаполненный известный прогресс.': 'Deletes all changes and restores the original values, including prefilled known progress.',
    'Сбросить сайт': 'Reset site',
    'Аккаунт и облачное сохранение': 'Account and cloud save',
    'Каждый пользователь получает отдельный прогресс': 'Each user has separate progress',
    'Открыть аккаунт': 'Open account',
    'Без входа данные остаются только в этом браузере. После подключения Supabase и входа они сохраняются в личной строке пользователя и доступны на другом устройстве.': 'Without signing in, data stays only in this browser. After connecting Supabase and signing in, it is stored in the user’s private row and available on another device.',
    'Изображения и источники': 'Images and sources',
    'Рендеры загружаются с Dandy’s World Wiki': 'Character renders are loaded from the Dandy’s World Wiki',
    'Dandy’s Progress — неофициальный фанатский трекер. Названия и изображения персонажей принадлежат их правообладателям. Если внешний источник недоступен, вместо картинки показываются инициалы.': 'Dandy’s Progress is an unofficial fan-made tracker. Character names and images belong to their respective owners. If an external source is unavailable, initials are shown instead.',
    'Краткая сводка': 'Quick summary',

    'Добровольная поддержка': 'Optional support',
    'Помочь развитию Dandy’s Progress': 'Support Dandy’s Progress development',
    'Сайт остаётся бесплатным для всех. Поддержка помогает обновлять данные после обновлений игры, исправлять ошибки и добавлять новые функции.': 'The site remains free for everyone. Support helps update game data, fix bugs and add new features.',
    'Оплата проходит на стороне Boosty. Dandy’s Progress не получает и не хранит данные банковской карты.': 'Payment is handled by Boosty. Dandy’s Progress does not receive or store bank card details.',
    'Перейти на Boosty': 'Open Boosty',
    'Поддерживать проект необязательно. Все основные функции трекера останутся бесплатными.': 'Supporting the project is optional. All core tracker features will remain free.',

    'Тун получен': 'Toon unlocked',
    'Винтажный скин': 'Vintage skin',
    'Точные требования из вики игры; значения прогресса вводятся вручную': 'Exact requirements from the game wiki; progress values are entered manually',
    'Из вики': 'From wiki',
    '+ Задание': '+ Task',
    'Заметки': 'Notes',
    'Билд, оставшиеся задания, план фарма...': 'Build, remaining tasks, farming plan…',
    'Задания восстановлены из вики': 'Tasks restored from the wiki',
    'Новое задание': 'New task',
    'Резервная копия скачана': 'Backup downloaded',
    'Точно сбросить весь прогресс? Это действие нельзя отменить без резервной копии.': 'Reset all progress? This cannot be undone without a backup.',
    'Прогресс сброшен': 'Progress reset',
    'Данные импортированы': 'Data imported',
    'Файл повреждён или имеет неверный формат.': 'The file is damaged or has an invalid format.',
    'Сбросить прогресс этого туна?': 'Reset this toon’s progress?',
    'Прогресс туна сброшен': 'Toon progress reset',
    'Личная цель добавлена': 'Custom goal added',
    'Личная цель удалена': 'Custom goal deleted',

    'Облачные аккаунты ещё не подключены': 'Cloud accounts are not connected yet',
    'Войти или создать аккаунт': 'Sign in or create an account',
    'Не удалось загрузить публичный профиль:': 'Could not load public profile:',
    'Не удалось создать публичный профиль:': 'Could not create public profile:',
    'Синхронизация…': 'Syncing…',
    'Ошибка облака': 'Cloud error',
    'Не удалось сохранить в облако:': 'Could not save to the cloud:',
    'Сохранено в облаке': 'Saved to cloud',
    'Синхронизировано:': 'Synced:',
    'Прогресс синхронизирован': 'Progress synced',
    'Загрузка облака…': 'Loading cloud data…',
    'Не удалось загрузить прогресс:': 'Could not load progress:',
    'Загружено из облака': 'Loaded from cloud',
    'Последнее облачное сохранение:': 'Latest cloud save:',
    'Создано первое облачное сохранение с данными этого браузера.': 'Created the first cloud save using data from this browser.',
    'Здесь появится короткое описание игрока.': 'A short player bio will appear here.',
    'Предпросмотр': 'Preview',
    'Сначала подключи Supabase по инструкции DEPLOY.md.': 'Connect Supabase using the instructions in DEPLOY.md first.',
    'Войди или создай аккаунт, чтобы сделать публичную страницу.': 'Sign in or create an account to make a public page.',
    'Сохраняем…': 'Saving…',
    'Ник должен содержать 3–24 символа: латинские буквы, цифры, _ или -.': 'The username must contain 3–24 characters: Latin letters, numbers, _ or -.',
    'Введи отображаемое имя.': 'Enter a display name.',
    'Этот ник уже занят. Выбери другой.': 'This username is already taken. Choose another one.',
    'Публичный профиль сохранён.': 'Public profile saved.',
    'Ссылка скопирована.': 'Link copied.',
    'Входим…': 'Signing in…',
    'Введи email и пароль.': 'Enter your email and password.',
    'Вход выполнен.': 'Signed in.',
    'Создаём аккаунт…': 'Creating account…',
    'Пароль должен содержать минимум 6 символов.': 'The password must contain at least 6 characters.',
    'Аккаунт создан, вход выполнен.': 'Account created and signed in.',
    'Аккаунт создан. Проверь письмо и подтверди email.': 'Account created. Check your email and confirm the address.',
    'Выходим…': 'Signing out…',
    'Ты вышел. На этом устройстве остаётся локальная копия.': 'You are signed out. A local copy remains on this device.',
    'Сохранено локально': 'Saved locally',
    'Ошибка инициализации облака:': 'Cloud initialization error:',

    'Политика конфиденциальности — Dandy’s Progress': 'Privacy Policy — Dandy’s Progress',
    'Политика конфиденциальности': 'Privacy Policy',
    'Шаблон — перед публичной публикацией замени данные в квадратных скобках.': 'Template — replace the information in square brackets before publishing.',
    'Какие данные хранятся': 'Data we store',
    'Сервис хранит email, технический идентификатор аккаунта, введённый пользователем игровой прогресс и настройки публичного профиля. Пароли обрабатываются системой аутентификации Supabase и не сохраняются в коде сайта.': 'The service stores email, a technical account identifier, game progress entered by the user and public profile settings. Passwords are handled by Supabase authentication and are not stored in the site code.',
    'Публичный профиль': 'Public profile',
    'Пользователь может добровольно открыть страницу, на которой отображаются ник, имя, описание, выбранный персонаж, коллекция, мастерства, исследования и общая игровая статистика. Email, пароль и личные заметки публично не показываются. Публичность страницы можно отключить в настройках профиля.': 'A user may voluntarily make a page public. It displays the username, display name, bio, selected character, collection, masteries, research and general game statistics. Email, password and private notes are not shown publicly. Public visibility can be disabled in profile settings.',
    'Зачем используются данные': 'How data is used',
    'Данные используются только для входа, синхронизации прогресса между устройствами и показа добровольно открытых страниц игроков.': 'Data is used only for sign-in, progress synchronization between devices and displaying player pages that users choose to make public.',
    'Передача и хранение': 'Processing and storage',
    'Данные обрабатываются инфраструктурой Supabase. Сайт не продаёт пользовательские данные и не использует их для рекламы.': 'Data is processed by Supabase infrastructure. The site does not sell user data or use it for advertising.',
    'Удаление данных': 'Data deletion',
    'Чтобы запросить удаление аккаунта, публичной страницы и прогресса, напиши:': 'To request deletion of an account, public page and progress, contact:',
    'Контакты': 'Contact',
    'Владелец сайта:': 'Site owner:',
    'Контакт:': 'Contact:',
    'Вернуться на сайт': 'Return to the site',
  };

  const mastery = {
    'Использовать активную способность': 'Use the active ability',
    'Купить предметы в магазине Денди': 'Buy items from Dandy’s Shop',
    'Пройти метров': 'Travel meters',
    'Пережить блэкауты': 'Survive blackouts',
    'Поднять предметы': 'Pick up items',
    'Использовать предметы': 'Use items',
    'Достичь этажа': 'Reach floor',
    'Завершить машины': 'Complete machines',
    'Пережить этажи': 'Survive floors',
    'Поднять капсулы исследования': 'Pick up research capsules',
    'Пережить этажи с Луи и Яттой в забеге': 'Survive floors with Looey and Yatta in the run',
    'Пережить этажи с 7 другими игроками': 'Survive floors with 7 other players',
    'Пережить этажи с Тишей в забеге': 'Survive floors with Tisha in the run',
    'Пережить этажи с Пебблом в забеге': 'Survive floors with Pebble in the run',
    'Пережить этажи с Яттой в забеге': 'Survive floors with Yatta in the run',
    'Использовать BonBon': 'Use BonBon',
    'Пережить этажи с 2 другими игроками': 'Survive floors with 2 other players',
    'Пережить этажи с 3 другими игроками': 'Survive floors with 3 other players',
    'Встретить твистедов': 'Encounter Twisteds',
    'Активировать пассивную способность': 'Trigger the passive ability',
    'Пережить этажи с Флаттер в забеге': 'Survive floors with Flutter in the run',
    'Пережить этажи с 4 другими игроками': 'Survive floors with 4 other players',
    'Пережить этажи со Скрапс в забеге': 'Survive floors with Scraps in the run',
    'Пережить этажи с любым главным туном': 'Survive floors with any Main Toon',
    'Пережить утечки ихора': 'Survive Ichor leaks',
    'Собрать процентов исследования твистедов': 'Collect Twisted research percent',
    'Пережить этажи с Конни в забеге': 'Survive floors with Connie in the run',
    'Пережить этажи с Космо в забеге': 'Survive floors with Cosmo in the run',
    'Съесть книжные полки': 'Eat bookshelves',
    'Пережить этажи с Брайтни в забеге': 'Survive floors with Brightney in the run',
    'Пережить этажи с Луи в забеге': 'Survive floors with Looey in the run',
    'Новое задание': 'New task',
  };

  const achievementDescriptions = {
    'Пройти 50 000 метров': 'Travel 50,000 meters',
    'Пройти 500 000 метров': 'Travel 500,000 meters',
    'Пройти 5 000 000 метров': 'Travel 5,000,000 meters',
    'Завершить 100 машин': 'Complete 100 machines',
    'Завершить 1 000 машин': 'Complete 1,000 machines',
    'Завершить 10 000 машин': 'Complete 10,000 machines',
    'Поднять 100 предметов': 'Pick up 100 items',
    'Поднять 1 000 предметов': 'Pick up 1,000 items',
    'Поднять 10 000 предметов': 'Pick up 10,000 items',
    'Пройти этаж Дайла за Шримпо': 'Complete Dyle’s floor as Shrimpo',
    'Посетить 15 уникальных этажей-карт за один забег': 'Visit 15 unique map floors in one run',
    'Пройти этаж Дайла': 'Complete Dyle’s floor',
    'Пройти этаж Дайла 25 раз': 'Complete Dyle’s floor 25 times',
    'Прослушать 25 уникальных сплетен Денди': 'Listen to 25 unique Dandy gossip lines',
    'Прослушать 25 уникальных сплетен Дайла': 'Listen to 25 unique Dyle gossip lines',
    'Завершить 10-й этаж': 'Complete floor 10',
    'Завершить 25-й этаж': 'Complete floor 25',
    'Завершить 50-й этаж': 'Complete floor 50',
    'Завершить 100-й этаж': 'Complete floor 100',
    'Съесть 10 уникальных книжных полок на одном этаже за Сквирма': 'Eat 10 unique bookshelves on one floor as Squirm',
    'Пройти этаж, ни разу не попавшись на глаза': 'Complete a floor without being spotted',
    'Пройти этаж менее чем за 1 минуту': 'Complete a floor in under 1 minute',
    'Одновременно отвлечь 6 твистедов': 'Distract 6 Twisteds at the same time',
    'Завершить мастерство 20 тунов': 'Complete the mastery of 20 Toons',
    'Купить все 3 предмета за один визит в магазин Денди': 'Buy all 3 items during one visit to Dandy’s Shop',
    'Купить все 3 предмета в предзабеговом магазине': 'Buy all 3 items in the pre-run shop',
    'Пройти этаж составом из 8 уникальных главных тунов': 'Complete a floor with 8 unique Main Toons',
    'Использовать стикер GTE во время паники': 'Use the GTE sticker during Panic Mode',
    'Находиться рядом с Твистед Глистеном 30 секунд подряд': 'Stay near Twisted Glisten for 30 consecutive seconds',
    'Затащить игрока в лифт способностью Губа во время паники': 'Pull a player into the elevator with Goob’s ability during Panic Mode',
    'Собрать все капсулы исследования на одном этаже': 'Collect every research capsule on one floor',
    'Пережить блэкаут, вызванный Твистед Брайтни': 'Survive a blackout caused by Twisted Brightney',
    'Главным туном пройти этаж с Твистед Денди': 'Complete a floor with Twisted Dandy as a Main Toon',
    'Пережить 5 этажей за забег без тринкетов': 'Survive 5 floors in one run without trinkets',
    'Пройти этаж с утечкой ихора, не попав в лужу': 'Complete an Ichor Leak floor without stepping in a puddle',
    'Дать стамину сразу 3 тунам способностью Астро': 'Give stamina to 3 Toons at once with Astro’s ability',
    'Выбрать карточку единогласно восьмью голосами': 'Choose a card unanimously with eight votes',
    'Сделать 10 идеальных скилл-чеков на одном этаже туном с 1 звездой': 'Hit 10 perfect skill checks on one floor with a 1-star Toon',
    'Заполнить весь инвентарь лечащими предметами': 'Fill the entire inventory with healing items',
    'Одновременно с другим игроком закончить дуо-машину': 'Finish a duo machine at the same time as another player',
    'Закончить дуо-машину, в которую внесли вклад 8 тунов': 'Finish a duo machine that all 8 Toons contributed to',
    'Найти все яйца в лобби': 'Find all eggs in the lobby',
    'Выполнить хотя бы одно недельное задание Спраута': 'Complete at least one Sprout weekly quest',
    'Помочь Bud пройти этаж 10 раз': 'Help Bud complete a floor 10 times',
    'Помочь Bud пройти этаж 25 раз': 'Help Bud complete a floor 25 times',
    'Помочь Bud пройти этаж 50 раз': 'Help Bud complete a floor 50 times',
    'Помочь Bud пройти этаж 100 раз': 'Help Bud complete a floor 100 times',
    'Выполнить хотя бы одно недельное задание Финна': 'Complete at least one Finn weekly quest',
    'Набрать 100 очков в Swimmy Barnaby': 'Score 100 points in Swimmy Barnaby',
  };

  const reverseExact = Object.fromEntries(Object.entries(exact).map(([ru, en]) => [en, ru]));
  const reverseMastery = Object.fromEntries(Object.entries(mastery).map(([ru, en]) => [en, ru]));
  const reverseAchievements = Object.fromEntries(Object.entries(achievementDescriptions).map(([ru, en]) => [en, ru]));

  function preserveWhitespace(original, translated) {
    const leading = original.match(/^\s*/)?.[0] || '';
    const trailing = original.match(/\s*$/)?.[0] || '';
    return `${leading}${translated}${trailing}`;
  }

  function patternTranslate(text, target) {
    if (target === 'en') {
      const rules = [
        [/^(\d+)% осталось$/, '$1% remaining'],
        [/^(\d+) тринкетов получено$/, '$1 trinkets unlocked'],
        [/^(\d+) профиль$/, '$1 profile'],
        [/^(\d+) профилей$/, '$1 profiles'],
        [/^(\d+) мастерств$/, '$1 masteries'],
        [/^(\d+) тунов$/, '$1 toons'],
        [/^(\d+) тринкетов$/, '$1 trinkets'],
        [/^(\d+) этаж$/, 'Floor $1'],
        [/^(\d+) очков$/, '$1 points'],
        [/^@(.+) · (\d+) мастерств · (\d+) тринкетов$/, '@$1 · $2 masteries · $3 trinkets'],
        [/^из (\d+)$/, 'of $1'],
        [/^из (\d+) получено$/, '$1 total'],
        [/^из (\d+) завершено$/, '$1 total'],
        [/^из (\d+) выполнено$/, '$1 total'],
        [/^исследовано на 100%: (\d+)$/, '100% researched: $1'],
        [/^(\d+) машин$/, '$1 machines'],
        [/^Обновлено: (.+)$/, 'Updated: $1'],
        [/^Последнее сохранение: (.+)$/, 'Last saved: $1'],
        [/^Только у (.+)$/, 'Only $1 has'],
        [/^Не удалось загрузить публичный профиль: (.+)$/, 'Could not load public profile: $1'],
        [/^Не удалось создать публичный профиль: (.+)$/, 'Could not create public profile: $1'],
        [/^Не удалось сохранить в облако: (.+)$/, 'Could not save to the cloud: $1'],
        [/^Не удалось загрузить прогресс: (.+)$/, 'Could not load progress: $1'],
        [/^Ошибка инициализации облака: (.+)$/, 'Cloud initialization error: $1'],
        [/^Синхронизировано: (.+)$/, 'Synced: $1'],
        [/^Последнее облачное сохранение: (.+)$/, 'Latest cloud save: $1'],
        [/^В базе: (\d+) тунов, (\d+) твистед и (\d+) официальных достижений\. Список основан на актуальном составе игры на момент создания версии; новые цели можно добавлять вручную\.$/, 'Database: $1 Toons, $2 Twisteds and $3 official achievements. The list reflects the game roster when this version was created; custom goals can be added manually.'],
      ];
      for (const [regex, replacement] of rules) if (regex.test(text)) return text.replace(regex, replacement);
    } else {
      const rules = [
        [/^(\d+)% remaining$/, '$1% осталось'],
        [/^(\d+) trinkets unlocked$/, '$1 тринкетов получено'],
        [/^(\d+) profile$/, '$1 профиль'],
        [/^(\d+) profiles$/, '$1 профилей'],
        [/^(\d+) masteries$/, '$1 мастерств'],
        [/^(\d+) toons$/, '$1 тунов'],
        [/^(\d+) trinkets$/, '$1 тринкетов'],
        [/^Floor (\d+)$/, '$1 этаж'],
        [/^(\d+) points$/, '$1 очков'],
        [/^@(.+) · (\d+) masteries · (\d+) trinkets$/, '@$1 · $2 мастерств · $3 тринкетов'],
        [/^of (\d+)$/, 'из $1'],
        [/^(\d+) total$/, 'из $1 получено'],
        [/^100% researched: (\d+)$/, 'исследовано на 100%: $1'],
        [/^(\d+) machines$/, '$1 машин'],
        [/^Updated: (.+)$/, 'Обновлено: $1'],
        [/^Last saved: (.+)$/, 'Последнее сохранение: $1'],
        [/^Only (.+) has$/, 'Только у $1'],
        [/^Could not load public profile: (.+)$/, 'Не удалось загрузить публичный профиль: $1'],
        [/^Could not create public profile: (.+)$/, 'Не удалось создать публичный профиль: $1'],
        [/^Could not save to the cloud: (.+)$/, 'Не удалось сохранить в облако: $1'],
        [/^Could not load progress: (.+)$/, 'Не удалось загрузить прогресс: $1'],
        [/^Cloud initialization error: (.+)$/, 'Ошибка инициализации облака: $1'],
        [/^Synced: (.+)$/, 'Синхронизировано: $1'],
        [/^Latest cloud save: (.+)$/, 'Последнее облачное сохранение: $1'],
      ];
      for (const [regex, replacement] of rules) if (regex.test(text)) return text.replace(regex, replacement);
    }
    return text;
  }

  function text(value) {
    const original = String(value ?? '');
    const core = original.trim();
    if (!core) return original;
    let translated;
    if (language === 'en') translated = exact[core] || patternTranslate(core, 'en');
    else translated = reverseExact[core] || patternTranslate(core, 'ru');
    return preserveWhitespace(original, translated);
  }

  function task(value) {
    const source = String(value ?? '');
    if (language === 'en') return mastery[source] || source;
    return reverseMastery[source] || source;
  }

  function achievement(value) {
    const source = String(value ?? '');
    if (language === 'en') return achievementDescriptions[source] || source;
    return reverseAchievements[source] || source;
  }

  function tier(value) {
    return text(value).trim();
  }

  function entityName(entity) {
    if (!entity) return '';
    return language === 'en' ? (entity.name || entity.ru || '') : (entity.ru || entity.name || '');
  }

  function secondaryEntityName(entity) {
    if (!entity) return '';
    return language === 'en' ? '' : (entity.name || '');
  }

  function locale() {
    return language === 'en' ? 'en-US' : 'ru-RU';
  }

  function translateNode(root = document) {
    if (!root) return;
    const doc = root.ownerDocument || document;
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.closest('[data-no-i18n]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const next = text(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    });

    const elements = root.querySelectorAll ? root.querySelectorAll('[placeholder], [title], [aria-label]') : [];
    elements.forEach(el => {
      for (const attr of ['placeholder', 'title', 'aria-label']) {
        if (!el.hasAttribute(attr)) continue;
        const current = el.getAttribute(attr);
        const next = text(current);
        if (next !== current) el.setAttribute(attr, next);
      }
    });

    document.documentElement.lang = language;
    const title = text(document.title);
    if (title !== document.title) document.title = title;
    const button = document.getElementById('languageToggle');
    if (button) {
      button.textContent = language === 'ru' ? 'EN' : 'RU';
      button.title = language === 'ru' ? 'Switch to English' : 'Переключить на русский';
      button.setAttribute('aria-label', button.title);
    }
  }

  function setLanguage(next) {
    if (next !== 'ru' && next !== 'en') return;
    if (next === language) return;
    language = next;
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    window.dispatchEvent(new CustomEvent('dandys-language-change', { detail: { language } }));
  }

  window.I18N = {
    get language() { return language; },
    text,
    task,
    achievement,
    tier,
    entityName,
    secondaryEntityName,
    locale,
    translate: translateNode,
    setLanguage,
    toggle() { setLanguage(language === 'ru' ? 'en' : 'ru'); },
  };

  document.addEventListener('DOMContentLoaded', () => translateNode(document));
})();
