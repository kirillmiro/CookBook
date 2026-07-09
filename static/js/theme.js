const theme = document.getElementById('theme');

// RESTORE THEME ON LOAD
if (localStorage.getItem('theme') === 'dark') {
    theme.checked = true;
}

// SAVE THEME ON CHANGE
theme.addEventListener('change', () => {
    if (theme.checked) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
});
