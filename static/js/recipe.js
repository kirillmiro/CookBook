document.addEventListener('DOMContentLoaded', () => {
    const picker = document.getElementById('recipe-stars-picker');
    const fill = document.getElementById('recipe-stars-fill');
    const rVal = document.getElementById('recipe-rating-val');
    const vVal = document.getElementById('recipe-votes-val');
    
    if (!picker || !fill) return;
    
    const recipeId = picker.dataset.id;
    // Объявляем переменную на уровне всего обработчика событий страницы
    let currentGlobalRating = parseFloat(rVal.textContent) || 0.00;

    // Инициализация при загрузке страницы: красим под оценку юзера или под средний рейтинг
    const userRating = parseFloat(picker.dataset.userRating);
    if (!isNaN(userRating) && userRating > 0) {
        fill.style.width = (userRating * 20) + '%';
    } else {
        fill.style.width = (currentGlobalRating * 20) + '%';
    }
    
    // Эффект hover (движение мыши) - строго следует по 0.5 звёзд
    picker.addEventListener('mousemove', (e) => {
        const rect = picker.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        let percent = (x / width) * 100;
        
        let rating = Math.ceil(percent / 10) * 0.5;
        if (rating < 0.5) rating = 0.5;
        if (rating > 5.0) rating = 5.0;
        
        fill.style.width = (rating * 20) + '%';
    });
    
    // Сброс hover при уходе мыши
    picker.addEventListener('mouseleave', () => {
        const currentUr = parseFloat(picker.dataset.userRating);
        if (!isNaN(currentUr) && currentUr > 0) {
            fill.style.width = (currentUr * 20) + '%';
        } else {
            fill.style.width = (currentGlobalRating * 20) + '%';
        }
    });
    
    // Клик на звезду
    picker.addEventListener('click', (e) => {
        const rect = picker.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        let percent = (x / width) * 100;
        
        let finalRating = Math.ceil(percent / 10) * 0.5;
        if (finalRating < 0.5) finalRating = 0.5;
        if (finalRating > 5.0) finalRating = 5.0;
        
        fetch(`/api/recipe/${recipeId}/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: finalRating })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // ВАЖНО: Актуализируем глобальный средний рейтинг, полученный от сервера
                currentGlobalRating = data.new_rating;
                
                rVal.textContent = data.new_rating.toFixed(2) + ' ★';
                vVal.textContent = 'Оценено ' + data.new_votes + ' раз';
                
                // Запоминаем личную оценку в дата-атрибут
                picker.dataset.userRating = finalRating;
                
                // Визуально фиксируем закраску звёзд под выбор пользователя
                fill.style.width = (finalRating * 20) + '%';
            } else {
                console.error('Ошибка при сохранении оценки:', data.error);
            }
        })
        .catch(err => console.error('Ошибка отправки запроса:', err));
    });

});