import { format } from 'date-fns';

export const formatDateTime = (date) => {
  return format(date, 'yyyy-MM-dd HH:mm:ss');
};
