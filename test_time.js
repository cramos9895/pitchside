const formatTimeTo12Hour = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const d = new Date();
    d.setHours(parseInt(hours), parseInt(minutes));
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};
console.log("20:00 ->", formatTimeTo12Hour("20:00"));
console.log("23:00 ->", formatTimeTo12Hour("23:00"));
