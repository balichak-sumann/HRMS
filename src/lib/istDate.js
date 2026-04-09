const IST_TIME_ZONE = 'Asia/Kolkata';

const getParts = (date = new Date()) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: IST_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const valueByType = {};
    for (const part of parts) {
        if (part.type !== 'literal') {
            valueByType[part.type] = part.value;
        }
    }

    return {
        year: Number(valueByType.year),
        month: Number(valueByType.month),
        day: Number(valueByType.day),
        hour: Number(valueByType.hour),
        minute: Number(valueByType.minute),
        second: Number(valueByType.second),
    };
};

export const getIstYmdFromDate = (date = new Date()) => {
    const { year, month, day } = getParts(date);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const getIstTodayYmd = () => getIstYmdFromDate(new Date());

export const getIstCurrentMonth = () => {
    const { year, month } = getParts(new Date());
    return `${year}-${String(month).padStart(2, '0')}`;
};

export const IST_TIMEZONE = IST_TIME_ZONE;
