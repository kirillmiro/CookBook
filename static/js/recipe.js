/**
 * Интерактивный выбор и динамическое изменение звездного рейтинга
 */
document.addEventListener('DOMContentLoaded', () => {
    const picker = document.getElementById('recipe-stars-picker');
    const fill = document.getElementById('recipe-stars-fill');
    const rVal = document.getElementById('recipe-rating-val');
    const vVal = document.getElementById('recipe-votes-val');
    
    if (!picker || !fill) return;
    
    const recipeId = picker.dataset.id;
    
    // Вытаскиваем из текста начальный рейтинг блюда (например, "4.50 ★" превращаем в число 4.50)
    let currentGlobalRating = parseFloat(rVal.textContent) || 0.00;
    
    // При загрузке страницы сразу выставляем звёзды в соответствии с рейтингом блюда
    fill.style.width = (currentGlobalRating * 20) + '%';
    
    // Подсветка звезд при движении мыши
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
    
    // ВАЖНО: При уходе мыши возвращаем звёзды к реальному рейтингу блюда, а не к 0%
    picker.addEventListener('mouseleave', () => {
        fill.style.width = (currentGlobalRating * 20) + '%';
    });
    
    // Клик для фиксации или изменения оценки
    picker.addEventListener('click', (e) => {
        const rect = picker.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        let percent = (x / width) * 100;
        
        let finalRating = Math.ceil(percent / 10) * 0.5;
        if (finalRating < 0.5) finalRating = 0.5;
        if (finalRating > 5.0) finalRating = 5.0;
        
        // Отправляем оценку на сервер
        fetch(`/api/recipe/${recipeId}/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: finalRating })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Обновляем глобальную переменную РЕАЛЬНЫМ рейтингом от сервера
                currentGlobalRating = data.new_rating;
                
                // Выводим текст, который прислал сервер (общий рейтинг блюда)
                rVal.textContent = data.new_rating.toFixed(2) + ' ★';
                vVal.textContent = 'Оценено ' + data.new_votes + ' раз';
                
                // Фиксируем закраску звёзд на новом пересчитанном рейтинге блюда
                fill.style.width = (currentGlobalRating * 20) + '%';
            } else {
                console.error('Ошибка при сохранении оценки:', data.error);
            }
        })
        .catch(err => console.error('Ошибка отправки запроса:', err));
    });
});