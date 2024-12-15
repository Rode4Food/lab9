document.addEventListener("DOMContentLoaded", () => {
    const socket = new WebSocket("ws://localhost:8888/ws");

    // Элементы DOM
    const messagesContainer = document.getElementById("messages");
    const onlineUsersContainer = document.getElementById("online-users"); // Контейнер для списка пользователей
    const messageInput = document.getElementById("message-input");
    const sendButton = document.getElementById("send-button");
    const userNameInput = document.getElementById("user-name-input");
    const setNameButton = document.getElementById("set-name-button");

    let userName = "Гость"; // Имя пользователя по умолчанию

    // Установка имени пользователя
    setNameButton.onclick = function () {
        if (userNameInput.value.trim() !== "") {
            userName = userNameInput.value.trim();
            // Отправляем сообщение с новым именем
            const payload = {
                name: userName,
                message: ""
            };
            socket.send(JSON.stringify(payload));
        }
    };

    // Обработка входящих сообщений
    socket.onmessage = function (event) {
    const data = JSON.parse(event.data);

    if (data.type === "users") {
        // Обновление списка пользователей
        onlineUsersContainer.innerHTML = ""; // Очистка списка
        data.users.forEach((user) => {
            const userItem = document.createElement("li");
            userItem.textContent = user;
            onlineUsersContainer.appendChild(userItem);
        });
        return;
    }

    if (data.type === "name_change") {
        // Обновление чата: отображение сообщения о смене имени
        const message = document.createElement("li");
        message.textContent = data.message; // Сообщение: "Пользователь изменил имя на..."
        message.style.color = "gray"; // Цвет для системных сообщений
        messagesContainer.appendChild(message);
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Автопрокрутка вниз
        return;
    }

    // Отображение обычных сообщений в чате
    const message = document.createElement("li");
    message.innerHTML = `<strong>${data.name}:</strong> ${data.message}`;
    message.style.wordBreak = "break-word"; // Перенос длинного текста
    messagesContainer.appendChild(message);
    messagesContainer.scrollTop = messagesContainer.scrollHeight; // Автопрокрутка вниз
};




    // Отправка сообщений
    const sendMessage = () => {
        if (messageInput.value.trim() !== "") {
            const payload = {
                name: userName,
                message: messageInput.value.trim(),
            };
            socket.send(JSON.stringify(payload)); // Отправка сообщения в формате JSON
            messageInput.value = ""; // Очистка поля ввода
        }
    };

    // Отправка сообщения по нажатию на кнопку
    sendButton.onclick = sendMessage;

    // Отправка сообщения по нажатию клавиши Enter
    messageInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            sendMessage();
        }
    });

    // Обработка ошибок WebSocket
    socket.onerror = function (error) {
        console.error("WebSocket error:", error);
    };

    // Обработка закрытия соединения
    socket.onclose = function () {
        console.warn("WebSocket connection closed.");
    };
});
