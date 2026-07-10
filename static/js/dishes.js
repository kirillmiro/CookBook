const folderMap = {
    'основное': 'main_courses',
    'суп': 'soups',
    'салат': 'salads',
    'десерт': 'desserts',
    'завтрак': 'breakfasts'
};

const state = {};
let currentSort = 'rating';
const categories = ['основное', 'суп', 'салат', 'десерт', 'завтрак'];

// INIT
categories.forEach(cat => {
    state[cat] = { page: 1, pages: 1 };
    loadCategory(cat);
});

// SORT BUTTONS
document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSort = btn.dataset.sort;
        categories.forEach(cat => { state[cat].page = 1; loadCategory(cat); });
    });
});

// PAGINATION BUTTONS
document.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const cat = btn.dataset.cat;
        const dir = parseInt(btn.dataset.dir);
        const newPage = state[cat].page + dir;
        if (newPage >= 1 && newPage <= state[cat].pages) {
            state[cat].page = newPage;
            loadCategory(cat);
        }
    });
});

function loadCategory(cat) {
    const container = document.getElementById(`recipes-grid-${cat}`);
    if (!container) return;

    container.classList.add('fade-out');

    setTimeout(() => {
        fetch(`/dishes/category/${cat}?sort=${currentSort}&page=${state[cat].page}`)
            .then(res => res.json())
            .then(data => {
                state[cat].pages = data.pages;
                container.innerHTML = renderRecipes(data.items, cat);
                updatePagination(cat, state[cat].page, data.pages);
                container.classList.remove('fade-out');
            })
            .catch(err => {
                console.error(err);
                container.classList.remove('fade-out');
            });
    }, 200);
}

// RENDER RECIPES TO HTML
function renderRecipes(items, cat) {
    if (!items || items.length === 0) {
        return `<p class="card-description" style="grid-column: 1/-1; text-align: center; padding: 2rem 0;">В этой категории пока нет рецептов.</p>`;
    }

    const folder = folderMap[cat] || 'Dishes';
    const serverFavoriteIds = window.FAVORITE_IDS || [];

    return items.map(dish => {
        // Проверка: лайкнуто ли блюдо на бэкенде или сохранено в сессионном массиве фронтенда
        const isFav = dish.is_liked === 1 || serverFavoriteIds.includes(String(dish.id));
        const votesCount = Number(dish.votes || 0);
        const ratingVal = Number(dish.rating || 0);
        const ratingFormatted = ratingVal.toFixed(2);

        // Добавляем data-id для глобального перехвата клика в favorites.js
        return `
            <article class="dish-card" data-id="${dish.id}">
                <div>
                    <img src="/static/images/Dishes/${folder}/${dish.image}" class="dish-card-img" alt="${dish.name}">
                </div>
                <div class="card-content">
                    <span class="card-category">${dish.category}</span>
                    <h3 class="card-name">${dish.name}</h3>
                    <p class="card-description">${dish.ingredients}</p>
                    <div class="card-footer">
                        <small class="card-votes">Оценено ${votesCount} раз</small>
                        <div class="card-actions">
                            <small class="card-rating">${ratingFormatted} ★</small>
                            <button class="heart-btn ${isFav ? 'heart-active' : ''}" 
                                    data-id="${dish.id}" 
                                    onclick="event.stopPropagation(); toggleFavorite('${dish.id}', this)" 
                                    title="В избранное">${isFav ? '♥' : '♡'}</button>
                        </div>
                    </div>
                </div>
            </article>`;
    }).join('');
}

function updatePagination(cat, page, pages) {
    const info = document.getElementById(`page-info-${cat}`);
    if (info) info.textContent = `${page} / ${pages}`;
    
    document.querySelectorAll(`.page-btn[data-cat="${cat}\"]`).forEach(btn => {
        const dir = parseInt(btn.dataset.dir);
        const disabled = (dir === -1 && page <= 1) || (dir === 1 && page >= pages);
        btn.classList.toggle('disabled', disabled);
    });
}