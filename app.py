import sqlite3
import datetime
import math
from rapidfuzz import fuzz
from flask import Flask, render_template, request, jsonify, session, url_for

# Импортируем наш обновленный список рецептов из файла данных
from recipes_data import DISHES_RECIPES

# APP CONFIGURATION
app = Flask(__name__, static_url_path='/static')
# Добавляем секретный ключ для работы сессий Flask (нужно для Избранного)
app.secret_key = 'super_secret_key_foodfinder_2026'

# DATABASE CONNECTION
def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

# TABLES INITIALIZATION
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # DROPPING TABLES FOR QUICK RESTART IF NEEDED (UNCOMMENT IF NECESSARY)
    cursor.execute("DROP TABLE IF EXISTS recipes")
    cursor.execute("DROP TABLE IF EXISTS viewed_history")

    # RECIPES_TABLE
    # ТАБЛИЦА БЛЮД
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            ingredients TEXT NOT NULL,
            instructions TEXT NOT NULL,
            image TEXT,
            rating REAL DEFAULT 0.0,
            votes INTEGER DEFAULT 0
        )
    ''')

    # ТАБЛИЦА ИСТОРИИ ПРОСМОТРОВ
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS viewed_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_session_id TEXT NOT NULL,
            recipe_id INTEGER NOT NULL,
            viewed_at DATETIME NOT NULL,
            FOREIGN KEY (recipe_id) REFERENCES recipes(id)
        )
    ''')

    # DB_FILLING
    # Проверяем количество записей в таблице
    cursor.execute("SELECT COUNT(*) FROM recipes")
    count = cursor.fetchone()[0]

    # Если таблица пустая (count == 0), делаем вставку
    if count == 0:
        cursor.executemany('''
            INSERT INTO recipes (name, category, ingredients, instructions, image, rating, votes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', DISHES_RECIPES)

    conn.commit()
    conn.close()

# Функция расчета Индекса Популярности
def calculate_popularity_score(recipe):
    rating = recipe['rating']
    votes = recipe['votes']
    if votes > 0 and rating < 3.5:
        return -1.0
    return rating * math.log1p(votes)

# Ротация для Блюд Дня и Популярного на Неделе
def get_featured_dishes(all_recipes):
    if len(all_recipes) < 3:
        return list(all_recipes), list(all_recipes)
        
    today = datetime.date.today()
    day_of_year = today.timetuple().tm_yday
    week_of_year = today.isocalendar()[1]
    
    sorted_by_popularity = sorted(all_recipes, key=calculate_popularity_score, reverse=True)
    top_pool = sorted_by_popularity[:10]
    if len(top_pool) < 3:
        top_pool = list(all_recipes)
        
    day_dishes = []
    for i in range(3):
        idx = (day_of_year + i) % len(top_pool)
        day_dishes.append(top_pool[idx])
        
    popular_dishes = []
    for i in range(3):
        idx = (week_of_year + i + 3) % len(top_pool)
        popular_dishes.append(top_pool[idx])
        
    return day_dishes, popular_dishes

# MAIN_ROUTE
@app.route('/')
def index():
    # Если у пользователя ещё нет временного ID, создаем его (используем текущее время + случайность)
    if 'user_guid' not in session:
        import uuid
        session['user_guid'] = str(uuid.uuid4())
        session.modified = True

    if 'favorite_ids' not in session:
        session['favorite_ids'] = []

    conn = get_db_connection()
    search_query = request.args.get('search', '').strip()
    all_recipes = conn.execute("SELECT * FROM recipes").fetchall()
    day_dishes, popular_dishes = get_featured_dishes(all_recipes)

    search_results = []
    if search_query:
        query = search_query.lower().replace("ё", "е")
        stop_words = {"и", "или", "из", "в", "во", "на", "по", "с", "со", "к", "для", "под", "над", "от", "до", "у", "о"}
        query_words = [w for w in query.split() if len(w) >= 3 and w not in stop_words]
        scored = []

        for recipe in all_recipes:
            name = recipe["name"].lower().replace("ё", "е")
            ingredients = recipe["ingredients"].lower().replace("ё", "е")
            score = 0

            if query == name:
                score += 1000
            elif query in name:
                score += 500

            for word in query_words:
                if word in name:
                    score += 120
                else:
                    for name_word in name.split():
                        if name_word.startswith(word):
                            score += 100
                        elif fuzz.ratio(word, name_word) >= 85:
                            score += 70

                if word in ingredients:
                    score += 35
                else:
                    for ing_word in ingredients.split():
                        if ing_word.startswith(word):
                            score += 25
                        elif fuzz.ratio(word, ing_word) >= 85:
                            score += 15

            score += fuzz.token_sort_ratio(query, name) * 0.5
            if score >= 120:
                scored.append((score, recipe))

        scored.sort(key=lambda x: x[0], reverse=True)
        search_results = [recipe for score, recipe in scored]

    # Избранное теперь живет только в сессии. Просто приводим ID к строкам для фронтенда
    string_favorite_ids = [str(fav_id) for fav_id in session.get('favorite_ids', [])]

    # БЛОК ИСТОРИИ
    user_guid = session.get('user_guid')
    history_dishes = []
    
    if user_guid:
        # Сразу вызываем .fetchall() в конце запроса, используя conn.execute
        history_dishes = conn.execute('''
            SELECT r.* FROM recipes r
            JOIN viewed_history h ON r.id = h.recipe_id
            WHERE h.user_session_id = ?
            ORDER BY h.viewed_at DESC
        ''', (user_guid,)).fetchall()

    conn.close()

    return render_template(
        "index.html",
        search_query=search_query,
        search_results=search_results,
        day_dishes=day_dishes,
        popular_dishes=popular_dishes,
        favorite_ids=string_favorite_ids,
        history_dishes=history_dishes
    )   

# DISHES_CATALOG_ROUTE
@app.route('/dishes')
def dishes():
    if 'favorite_ids' not in session:
        session['favorite_ids'] = []

    string_favorite_ids = [str(fav_id) for fav_id in session['favorite_ids']]
    return render_template('dishes_list.html', favorite_ids=string_favorite_ids)

# API_FOR_CATALOG_PAGINATION
@app.route('/dishes/category/<string:cat>')
def dishes_category(cat):
    conn = get_db_connection()
    sort = request.args.get("sort", "rating")
    page = int(request.args.get("page", 1))
    per_page = 4

    sort_options = {
        "rating": "rating DESC",
        "votes": "votes DESC",
        "name": "name ASC"
    }
    order = sort_options.get(sort, "rating DESC")
    offset = (page - 1) * per_page

    total = conn.execute("SELECT COUNT(*) FROM recipes WHERE category = ?", (cat,)).fetchone()[0]
    pages = math.ceil(total / per_page) if total > 0 else 1

    rows = conn.execute(f"""
        SELECT id, name, category, ingredients, image, rating, votes 
        FROM recipes 
        WHERE category = ? 
        ORDER BY {order} 
        LIMIT ? OFFSET ?
    """, (cat, per_page, offset)).fetchall()
    
    conn.close()

    items = []
    for r in rows:
        # Проверяем статус лайка динамически из сессии текущего пользователя
        is_liked = 1 if r["id"] in session.get('favorite_ids', []) else 0
        items.append({
            "id": r["id"],
            "name": r["name"],
            "category": r["category"],
            "ingredients": r["ingredients"],
            "image": r["image"],
            "rating": r["rating"],
            "votes": r["votes"],
            "is_liked": is_liked
        })

    return jsonify({"items": items, "page": page, "pages": pages})

# FAVORITES_PAGE_ROUTE
@app.route('/favorites')
def favorites():
    if 'favorite_ids' not in session:
        session['favorite_ids'] = []
        
    conn = get_db_connection()
    favorite_recipes = []
    
    # Если в сессии есть лайки, достаем только эти рецепты
    if session['favorite_ids']:
        placeholders = ','.join('?' for _ in session['favorite_ids'])
        favorite_recipes = conn.execute(f"SELECT * FROM recipes WHERE id IN ({placeholders})", session['favorite_ids']).fetchall()
    conn.close()

    string_favorite_ids = [str(fav_id) for fav_id in session['favorite_ids']]
    return render_template('favorite_dishes.html', favorite_recipes=favorite_recipes, favorite_ids=string_favorite_ids)

# RECIPE_DETAIL_PAGE
@app.route('/recipe/<int:recipe_id>')
def recipe_detail(recipe_id):
    # Проверяем ID пользователя, на всякий случай генерируем, если зашел сразу по ссылке
    if 'user_guid' not in session:
        import uuid
        session['user_guid'] = str(uuid.uuid4())
        session.modified = True
        
    user_guid = session['user_guid']
    current_time = datetime.datetime.now()

    db = get_db_connection()
    cursor = db.cursor()

    # Удаляем старую запись об этом рецепте у этого пользователя, если она была
    cursor.execute(
        "DELETE FROM viewed_history WHERE user_session_id = ? AND recipe_id = ?", 
        (user_guid, recipe_id)
    )
    
    # Вставляем свежую запись с текущим временем секунда в секунду
    cursor.execute(
        "INSERT INTO viewed_history (user_session_id, recipe_id, viewed_at) VALUES (?, ?, ?)",
        (user_guid, recipe_id, current_time)
    )
    db.commit()

    conn = get_db_connection()
    recipe = conn.execute("SELECT * FROM recipes WHERE id = ?", (recipe_id,)).fetchone()
    conn.close()
    
    if recipe is None:
        return "Рецепт не найден", 404
        
    string_favorite_ids = [str(fav_id) for fav_id in session['favorite_ids']]

    # Получаем URL страницы, с которой пришел пользователь
    back_url = request.referrer
    allowed_endpoints = ['/', '/favorites', '/catalog', '?search=']
    
    # Проверяем, содержит ли referrer один из наших разделов
    if not back_url or not any(endpoint in back_url for endpoint in allowed_endpoints):
        back_url = url_for('index')
    return render_template('recipe.html', dish=recipe, favorite_ids=string_favorite_ids, back_url=back_url)

# ENDPOINT_FOR_TOGGLING_LIKE_STATUS (DATABASE SYNC)
@app.route('/toggle_favorite/<int:recipe_id>', methods=['POST'])
def toggle_favorite(recipe_id):
    conn = get_db_connection()
    recipe = conn.execute("SELECT id FROM recipes WHERE id = ?", (recipe_id,)).fetchone()
    conn.close()
    
    if recipe is None:
        return jsonify({"success": False, "error": "Рецепт не найден"}), 404
        
    if 'favorite_ids' not in session:
        session['favorite_ids'] = []
        
    if recipe_id in session['favorite_ids']:
        session['favorite_ids'].remove(recipe_id)
        status_text = 'removed'
    else:
        session['favorite_ids'].append(recipe_id)
        status_text = 'added'
        
    session.modified = True
    return jsonify({"success": True, "status": status_text})

# ROUTE_FOR_RATING_UPDATE
@app.route('/api/recipe/<int:recipe_id>/rate', methods=['POST'])
def rate_recipe(recipe_id):
    data = request.get_json()
    new_user_rating = float(data.get('rating', 0))
    
    if not (0.5 <= new_user_rating <= 5.0):
        return jsonify({'success': False, 'error': 'Неверное значение оценки'}), 400

    # Инициализируем словарь оценок в сессии, если его ещё нет
    if 'rated_recipes' not in session:
        session['rated_recipes'] = {}

    # Подключаемся к базе данных (пример для SQLite)
    db = get_db_connection()
    cursor = db.cursor()
    cursor.execute("SELECT rating, votes FROM recipes WHERE id = ?", (recipe_id,))
    dish = cursor.fetchone()
    
    if not dish:
        return jsonify({'success': False, 'error': 'Рецепт не найден'}), 404

    current_rating = float(dish['rating'])
    current_votes = int(dish['votes'])
    
    # Проверяем, меняет ли пользователь оценку или голосует впервые
    recipe_id_str = str(recipe_id)
    if recipe_id_str in session['rated_recipes']:
        # Сценарий: ИЗМЕНЕНИЕ ОЦЕНКИ
        old_user_rating = float(session['rated_recipes'][recipe_id_str])
        if current_votes > 0:
            total_score = (current_rating * current_votes) - old_user_rating + new_user_rating
            updated_rating = total_score / current_votes
        else:
            updated_rating = new_user_rating
            current_votes = 1
        updated_votes = current_votes
    else:
        # Сценарий: НОВЫЙ ГОЛОС
        updated_votes = current_votes + 1
        total_score = (current_rating * current_votes) + new_user_rating
        updated_rating = total_score / updated_votes

    # Жесткое ограничение верхнего порога и округление для всех исходов
    if updated_rating > 5.0:
        updated_rating = 5.0
        
    updated_rating = round(max(0.0, updated_rating), 2)

    # Обновляем значение в сессии пользователя
    session['rated_recipes'][recipe_id_str] = new_user_rating
    session.modified = True

    return jsonify({
        'success': True, 
        'new_rating': updated_rating, 
        'new_votes': updated_votes
    })

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)