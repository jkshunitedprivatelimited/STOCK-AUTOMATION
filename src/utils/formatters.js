// Shared formatting utilities used across the application

/**
 * Format a number as Indian Rupees (INR) currency
 */
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
};

/**
 * Convert a numeric amount to words in Indian numbering system
 * e.g. 1234 → "One Thousand Two Hundred and Thirty Four Rupees Only"
 */
export const amountToWords = (price) => {
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice === 0) return "Zero Rupees Only";
    
    const priceStr = Math.abs(numPrice).toFixed(2);
    const [rupeesStr, paiseStr] = priceStr.split('.');
    
    const num = parseInt(rupeesStr, 10);
    const paise = parseInt(paiseStr, 10);
    
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const inWords = (n) => {
        if ((n = n.toString()).length > 9) return 'overflow';
        let n_array = ('000000000' + n).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n_array) return '';
        let str = '';
        str += (n_array[1] != 0) ? (a[Number(n_array[1])] || b[n_array[1][0]] + ' ' + a[n_array[1][1]]) + 'Crore ' : '';
        str += (n_array[2] != 0) ? (a[Number(n_array[2])] || b[n_array[2][0]] + ' ' + a[n_array[2][1]]) + 'Lakh ' : '';
        str += (n_array[3] != 0) ? (a[Number(n_array[3])] || b[n_array[3][0]] + ' ' + a[n_array[3][1]]) + 'Thousand ' : '';
        str += (n_array[4] != 0) ? (a[Number(n_array[4])] || b[n_array[4][0]] + ' ' + a[n_array[4][1]]) + 'Hundred ' : '';
        str += (n_array[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_array[5])] || b[n_array[5][0]] + ' ' + a[n_array[5][1]]) : '';
        return str.trim();
    };
    
    let result = '';
    if (num > 0) {
        const words = inWords(num);
        result = words === 'overflow' ? num.toString() : words;
    }
    
    let finalStr = "";
    if (num > 0) {
        finalStr = result + " Rupees";
    }
    
    if (paise > 0) {
        if (num > 0) finalStr += " and ";
        finalStr += inWords(paise) + " Paise";
    }
    
    return (numPrice < 0 ? "Minus " : "") + finalStr + " Only";
};

const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    return dateStr.includes('Z') || dateStr.includes('+')
        ? new Date(dateStr)
        : new Date(dateStr.replace(' ', 'T') + "Z");
};

/**
 * Format a date string to Indian format (e.g. 01/12/2024)
 */
export const formatDate = (dateStr) => {
    if (!dateStr) return "---";
    return parseDate(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
    });
};

/**
 * Format a date string to time in Indian format (e.g. 02:30 PM)
 */
export const formatTime = (dateStr) => {
    if (!dateStr) return "";
    return parseDate(dateStr).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });
};

/**
 * Format a date string to full datetime string (e.g. 01 Jan 2024, 02:30 PM)
 */
export const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    const dateObj = parseDate(dateStr);
    return dateObj.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
        timeZone: 'Asia/Kolkata'
    });
};
