import { formatInTimeZone } from "date-fns-tz";

export const formatDate = (date, timeZone, format = "dd/MM/yyyy HH:mm:ss") => {
  return formatInTimeZone(date, timeZone, format);
};
