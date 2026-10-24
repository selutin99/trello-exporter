import type { formatsEn } from './formats-en';
export const formatsRu = {
  formatYes: 'Да',
  formatNo: 'Нет',
  formatGlyphFallback:
    'Символы, недоступные во встроенных шрифтах, сохранены в виде кодов Unicode, например [U+1F642]',
  exportMarkdownNote: 'Доска в виде документа, без файлов вложений',
  exportPdfNote: 'Документ с разбивкой на страницы для чтения и отправки',
  exportXlsxNote: 'Связанные листы с полными данными доски',
  exportCsvNote: 'Одна строка на карточку, связанные коллекции в ячейках JSON',
  formatCapture: 'Интервал экспорта',
  formatBoard: 'Доска',
  formatStart: 'Начало',
  formatDue: 'Срок',
  formatCompleted: 'Завершено',
  formatLabels: 'Метки',
  formatMembers: 'Участники',
  formatNoLink: 'Исходная ссылка недоступна',
  formatNotice:
    'Только активное содержимое · файлы вложений доступны в ZIP · восстановление из JSON/ZIP',
} satisfies { [Key in keyof typeof formatsEn]: string };
