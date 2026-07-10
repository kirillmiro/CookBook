document.addEventListener('DOMContentLoaded', () => {
    const picker = document.getElementById('recipe-stars-picker');
    const fill = document.getElementById('recipe-stars-fill');
    const rVal = document.getElementById('recipe-rating-val');
    const vVal = document.getElementById('recipe-votes-val');
    
    if (!picker || !fill) return;
    
    const recipeId = picker.dataset.id;
    
    // Очищаем строку от знака ★ и пробелов, чтобы получить чистое float число
    let currentGlobalRating = parseFloat(rVal.textContent.replace('★', '').trim()) || 0.00;
    const userRating = parseFloat(picker.dataset.userRating) || 0;

    // Инициализация при загрузке страницы
    if (userRating > 0) {
        fill.style.width = (userRating * 20) + '%';
    } else {
        fill.style.width = (currentGlobalRating * 20) + '%';
    }
    
    // Эффект hover
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
    
    // Сброс hover
    picker.addEventListener('mouseleave', () => {
        const currentUr = parseFloat(picker.dataset.userRating) || 0;
        if (currentUr > 0) {
            fill.style.width = (currentUr * 20) + '%';
        } else {
            fill.style.width = (currentGlobalRating * 20) + '%';
        }
    });
    
    // Клик мышкой
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
                // Перезаписываем глобальную переменную новым средним значением от сервера
                currentGlobalRating = data.new_rating;
                
                // Обновляем текст на UI (теперь при обновлении страницы он будет браться из сессии/бд верно)
                rVal.textContent = data.new_rating.toFixed(2) + ' ★';
                vVal.textContent = 'Оценено ' + data.new_votes + ' раз';
                
                // Фиксируем выбор пользователя в DOM
                picker.dataset.userRating = finalRating;
                fill.style.width = (finalRating * 20) + '%';
            } else {
                console.error('Ошибка при сохранении оценки:', data.error);
            }
        })
        .catch(err => console.error('Ошибка отправки запроса:', err));
    });
});