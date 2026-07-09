const burger = document.querySelector(".burger");
const menu = document.querySelector(".nav-links");

if (burger && menu) {
    burger.addEventListener('click', () => {
        burger.classList.toggle("active");
        menu.classList.toggle("show");
    });

    // Дополнительный бонус: если пользователь кликнет на ссылку, меню само закроется
    document.querySelectorAll(".nav-links a").forEach(link => {
        link.addEventListener("click", () => {
            burger.classList.remove("active");
            menu.classList.remove("show");
        });
    });
}