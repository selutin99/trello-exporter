# Исследование рынка и технические источники

Дата проверки: 18 октября 2026 года. Сравнение основано на документации
разработчиков; практический экспорт и восстановление не проводились.

## Близкие решения

| Продукт | Что уже есть | Отличие от целевого сценария |
| --- | --- | --- |
| [Встроенный экспорт Trello](https://support.atlassian.com/trello/docs/exporting-data-from-trello/) | JSON, CSV для Premium; экспорт Workspace может включать файлы | Встроенного воссоздания доски из JSON/CSV нет |
| [Board Export](https://docs.adaptavist.com/be/latest/welcome/) | Excel, CSV, PDF, PNG | Обратная загрузка не заявлена; состав данных зависит от формата |
| [TrelloExport](https://github.com/trapias/TrelloExport) | Открытое расширение Chrome: Excel, CSV, Markdown, HTML, OPML | Восстановление доски не заявлено |
| [Blue Cat Exports](https://www.bluecatreports.com/exports/) / [Imports](https://www.bluecatreports.com/imports/) | CSV-экспорт и импорт CSV/XLSX с сопоставлением полей | Документирован импорт карточек; полнота восстановления всей доски не подтверждена |
| [Board Export Lite](https://www.trello-plugins.com/board-export-lite) | Снимок JSON/CSV/XLSX вручную и по расписанию | Восстановления нет; вложения и комментарии не входят в подтверждённую модель |
| [Kanban Importer](https://njligames.com/help/kanban-importer/migrating-from-jira-github-trello) | Воссоздание содержимого из JSON Trello | Пропускает архивные карточки, пользовательские поля, файлы вложений, комментарии сверх первого и другие данные |
| [BackupLABS](https://backuplabs.io/integrations/trello-backup/) | Снимки, скачивание ZIP, восстановление новой доски | Документация описывает восстановление из хранилища сервиса; импорт произвольного архива не подтверждён |
| [ProBackup](https://support.probackup.io/en/articles/9292103-how-to-restore-trello-data) | Восстановление новой доски, карточек, файлов и комментариев | Восстановление из резервных копий сервиса; автоматизации и представления не переносятся |
| [Rewind](https://rewind.com/products/backups/trello/) | Ежедневные снимки и восстановление доски на дату | [Справка об ограничениях](https://help.rewind.com/hc/en-us/articles/28785780290203-What-Does-Rewind-Backup-For-Trello) отдельно указывает, что комментарии сохраняются, но не восстанавливаются |

## Вывод для проекта

Снимки текущего состояния и восстановление уже существуют. Гипотеза отличия
проекта — открытый переносимый JSON/ZIP с файлами, локальный просмотр,
предпросмотр восстановления и явный отчёт о потерях. Это продуктовая гипотеза,
а не утверждение об отсутствии конкурентов или подтверждённом спросе.

Первые кандидаты для практического сравнения: BackupLABS и связка встроенного
JSON Trello с Kanban Importer. Сравнивать нужно восстановленные данные на одной
синтетической доске, включая архив, комментарии, файлы, поля и совпадающие имена.

## Технические источники

- [Trello REST API: Boards](https://developer.atlassian.com/cloud/trello/rest/api-group-boards/)
- [Trello REST API: Cards](https://developer.atlassian.com/cloud/trello/rest/api-group-cards/)
- [Лимиты запросов Trello](https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/)
- [Создание Power-Up](https://developer.atlassian.com/cloud/trello/guides/power-ups/your-first-power-up/)
- [Как устроен JSON-экспорт Trello](https://support.atlassian.com/trello/docs/making-sense-of-trellos-json-export/)
- [Состав экспортов Board Export](https://docs.adaptavist.com/be/latest/data-included-with-exports/)
- [Trello Desktop для macOS и Windows](https://support.atlassian.com/trello/docs/trello-desktop-apps/)
- [Power-Up Client Library: интерфейсы внутри Trello](https://developer.atlassian.com/cloud/trello/power-ups/client-library/)
- [Локализация Power-Up](https://developer.atlassian.com/cloud/trello/power-ups/client-library/localization/)
- [Locale в контексте Power-Up](https://developer.atlassian.com/cloud/trello/power-ups/client-library/t-getcontext/)

## Проверка desktop и локализации

Платформенный SDK предоставляет интерфейсы Power-Up внутри Trello и средства
локализации. Совместимость конкретного пути авторизации, выбора и сохранения
файлов с установленным Trello Desktop должна подтверждаться прототипом.
Работа в браузере не заменяет такой проверки.

Например, [TRELLO-1706](https://jira.atlassian.com/browse/TRELLO-1706) описывает
проблему открытия стороннего Power-Up в Windows-клиенте; на дату исследования
она отмечена как исправленная. Это основание включить desktop в матрицу
проверок, а не утверждение о текущей неработоспособности Power-Up.

Перед реализацией нужно проверить фактическое поведение API и авторизации.
Сведения о конкурентах не заменяют технический контракт и могут измениться.
