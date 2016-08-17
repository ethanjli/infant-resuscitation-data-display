function fromDateString(dateString) {
    var a = dateString.split(':');
    return a[0] * 60 + a[1] * 1;
}

