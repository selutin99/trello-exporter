import { chooseLocale, localizePage, translations } from '../i18n';
import { product } from '../config/product';

let preference: string | null = null;
try {
  preference = localStorage.getItem('exporter-locale');
} catch {
  /* Language links also work when optional preference storage is unavailable */
}
const locale = chooseLocale(
  new URL(window.location.href).searchParams.get('lang') ?? preference ?? navigator.language,
);
localizePage(locale, document);
document.title = `${product.name} · ${translations[locale].privacy}`;
