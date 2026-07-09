/**
 * Глобальный скрипт для обработки карточек блюд (Лайки + Переходы на рецепт)
 */
document.addEventListener("DOMContentLoaded", () => {
    // 1. Считываем массив лайков с сервера при загрузке абсолютно любой страницы
    const container = document.getElementById("dishes-page-container");
    if (container && container.dataset.favorites) {
        try {
            window.FAVORITE_IDS = JSON.parse(container.dataset.favorites).map(String);
        } catch (e) {
            console.error("Ошибка парсинга favorite_ids:", e);
            window.FAVORITE_IDS = [];
        }
    } else {
        window.FAVORITE_IDS = [];
    }

    // 2. ГЛОБАЛЬНЫЙ КЛИК ПО КАРТОЧКАМ (Работает везде: Главная, Поиск, Каталог, Избранное)
    document.body.addEventListener('click', (event) => {
        // Проверяем, кликнули ли мы по карточке блюда
        const card = event.target.closest('.dish-card');
        
        // Если клик внутри карточки, но мы НЕ нажали на кнопку сердечка (или внутри неё)
        if (card && !event.target.closest('.heart-btn')) {
            // Забираем ID рецепта из data-атрибута карточки
            const recipeId = card.dataset.id;
            if (recipeId) {
                window.location.href = `/recipe/${recipeId}`;
            }
        }
    });
});

/**
 * Универсальная функция переключения лайка (Вызывается по клику на кнопку-сердечко)
 */
function toggleFavorite(recipeId, button) {
    const standardId = recipeId.toString();

    // Отправляем запрос на серверную ручку Flask
    fetch(`/toggle_favorite/${recipeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (!window.FAVORITE_IDS) window.FAVORITE_IDS = [];

        if (data.status === 'added') {
            // Красим сердечко
            button.classList.add('heart-active');
            button.innerHTML = '♥';
            if (!window.FAVORITE_IDS.includes(standardId)) {
                window.FAVORITE_IDS.push(standardId);
            }
        } else if (data.status === 'removed') {
            // Гасим сердечко
            button.classList.remove('heart-active');
            button.innerHTML = '♡';
            window.FAVORITE_IDS = window.FAVORITE_IDS.filter(id => id !== standardId);
            
            // Если мы находимся на странице Избранного, плавно убираем карточку
            const favoriteCard = button.closest('.dish-card');
            if (window.location.pathname.includes('/favorites') && favoriteCard) {
                favoriteCard.style.opacity = '0';
                favoriteCard.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    favoriteCard.remove();
                    
                    // Если удалили последнюю карточку, показываем надпись-заглушку
                    const grid = document.querySelector('.dishes-grid');
                    if (grid && grid.querySelectorAll('.dish-card').length === 0) {
                        grid.innerHTML = '<p class="card-description" style="grid-column: 1/-1; text-align: center; width: 100%; padding: 4rem 0; font-size: 1.2rem; color: var(--color-text-muted);">Вы ещё не добавили ни одного блюда в избранное.</p>';
                    }
                }, 300);
            }
        }

        // Синхронизируем изменения обратно в data-атрибут HTML контейнера
        const container = document.getElementById("dishes-page-container");
        if (container) {
            container.dataset.favorites = JSON.stringify(window.FAVORITE_IDS);
        }
    })
    .catch(error => console.error('Ошибка при отправке лайка:', error));
}