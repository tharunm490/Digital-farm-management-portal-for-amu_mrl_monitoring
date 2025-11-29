import { useAuth } from '../context/AuthContext';
import translations from '../data/translations.json';

export const useTranslation = () => {
  const { language, user } = useAuth();

  // If user is not farmer, force English
  const effectiveLanguage = user && user.role === 'farmer' ? language : 'en';

  const t = (key) => {
    return translations[effectiveLanguage][key] || key;
  };

  return { t, language: effectiveLanguage };
};