document.addEventListener('DOMContentLoaded', () => {
    const btnMore = document.getElementById('history-btn-more');
    const btnAll = document.getElementById('history-btn-all');
    const btnHide = document.getElementById('history-btn-hide');
    
    // Если истории на странице нет или блюд 3 и меньше, скрипт завершает работу
    if (!btnMore || !btnAll || !btnHide) return; 

    let currentPage = 1;
    const allCards = document.querySelectorAll('.history-card');
    let maxPage = 1;

    // Автоматически вычисляем максимальное количество страниц/порций (по 3 блюда)
    allCards.forEach(card => {
        const p = parseInt(card.getAttribute('data-page'), 10);
        if (p > maxPage) maxPage = p;
    });

    // 1. КЛИК НА "СМОТРЕТЬ ДАЛЬШЕ" (Порциями по 3 штуки)
    btnMore.addEventListener('click', () => {
        currentPage++;
        
        // Показываем кнопку "Скрыть", так как теперь на экране больше одной порции
        btnHide.style.display = 'inline-block';
        
        // Находим карточки, принадлежащие следующей странице, и плавно их отображаем
        const targetCards = document.querySelectorAll(`.history-card[data-page="${currentPage}"]`);
        targetCards.forEach(card => {
            card.classList.add('history-card-visible');
            card.classList.remove('history-card-hidden');
        });

        // Если дошли до самой последней порции и открывать больше нечего
        if (currentPage >= maxPage) {
            btnMore.style.display = 'none';
            btnAll.style.display = 'none';
        }
    });

    // 2. КЛИК НА "СМОТРЕТЬ ВСЁ" (Мгновенное раскрытие всех оставшихся карточек)
    btnAll.addEventListener('click', () => {
        // Пробегаем по всем скрытым карточкам со страниц выше первой и отображаем их
        allCards.forEach(card => {
            if (parseInt(card.getAttribute('data-page'), 10) > 1) {
                card.classList.add('history-card-visible');
                card.classList.remove('history-card-hidden');
            }
        });

        // Переводим счетчик текущей страницы на максимум
        currentPage = maxPage;

        // Прячем кнопки дальнейшего просмотра, оставляем только "Скрыть"
        btnMore.style.display = 'none';
        btnAll.style.display = 'none';
        btnHide.style.display = 'inline-block';
    });

    // 3. КЛИК НА "СКРЫТЬ" (Плавное сворачивание до базовых 3 элементов)
    btnHide.addEventListener('click', () => {
        // Сбрасываем текущую страницу на первую порцию
        currentPage = 1;
        
        // Прячем обратно все карточки, которые находятся дальше первой страницы
        allCards.forEach(card => {
            if (parseInt(card.getAttribute('data-page'), 10) > 1) {
                card.classList.remove('history-card-visible');
                card.classList.add('history-card-hidden');
            }
        });

        // Возвращаем кнопки управления в исходное состояние
        btnMore.style.display = 'inline-block';
        btnAll.style.display = 'inline-block';
        btnHide.style.display = 'none';
        
        // Плавно подкручиваем экран к началу блока истории, чтобы пользователю было удобно
        btnMore.closest('.dishes-section').scrollIntoView({ behavior: 'smooth' });
    });
});