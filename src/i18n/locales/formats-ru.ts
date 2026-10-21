import type { formatsEn } from './formats-en';
export const formatsRu = {
  formatYes: 'Да',
  formatNo: 'Нет',
  formatGlyphFallback:
    'Символы, недоступные во встроенных шрифтах, сохранены в виде кодов Unicode, например [U+1F642]',
  exportMarkdownTitle: 'Markdown',
  exportMarkdownNote: 'Доска в виде документа, без файлов вложений',
  exportPdfTitle: 'PDF',
  exportPdfNote: 'Документ с разбивкой на страницы для чтения и отправки',
  exportXlsxTitle: 'XLSX',
  exportXlsxNote: 'Связанные листы с полными данными доски',
  exportCsvTitle: 'CSV',
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
