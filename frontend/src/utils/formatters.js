import { format, isValid } from 'date-fns';

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isValid(d)) return format(d, 'MMM dd, yyyy HH:mm');
    return dateString;
  } catch {
    return dateString;
  }
};
