let fuse = null;

fetch('/api/recipes/names')
    .then(r => r.json())
    .then(data => {
        fuse = new Fuse(data, {
            keys: ['name'],
            threshold: 0.4,
            minMatchCharLength: 2
        });
    });

const input = document.getElementById('searchInput');
const suggestions = document.getElementById('searchSuggestions');

if (input) {
    input.addEventListener('input', () => {
        const q = input.value.trim();
        if (!q || !fuse) { suggestions.style.display = 'none'; return; }
        const results = fuse.search(q).slice(0, 8);
        if (!results.length) { suggestions.style.display = 'none'; return; }
        suggestions.innerHTML = results.map(r => `
            <div class="suggestion-item" onclick="window.location='/recipe/${r.item.id}'">
                <div>
                    <div class="suggestion-name">${r.item.name}</div>
                    <div class="suggestion-cat">${r.item.category}</div>
                </div>
            </div>`).join('');
        suggestions.style.display = 'block';
    });

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && fuse) {
            const q = input.value.trim();
            if (!q) return;
            const results = fuse.search(q);
            if (results.length) window.location = `/recipe/${results[0].item.id}`;
            suggestions.style.display = 'none';
        }
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.search-wrapper')) {
            suggestions.style.display = 'none';
        }
    });
}