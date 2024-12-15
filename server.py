import tornado.ioloop
import tornado.web
import tornado.websocket
import redis.asyncio as aioredis  # Используем асинхронный Redis клиент
import json
import asyncio

# Асинхронный клиент Redis
redis_client = aioredis.Redis()

# Список имён подключённых клиентов
connected_clients = set()
user_names = {}  # Сопоставление WebSocket соединения и имени пользователя

class WebSocketHandler(tornado.websocket.WebSocketHandler):
    def open(self):
        # При подключении добавляем клиента в список
        connected_clients.add(self)
        user_names[self] = "Аноним"  # Имя по умолчанию
        self.broadcast_user_list()

    async def on_message(self, message):
        # Проверяем, если это сообщение для смены имени
        data = json.loads(message)
        if "name" in data and "message" in data:
            user_names[self] = data["name"]  # Обновляем имя пользователя
            self.broadcast_user_list()  # Обновляем список пользователей

            # Публикуем сообщение в Redis
            chat_message = json.dumps({"name": data["name"], "message": data["message"]})
            await redis_client.publish("chat", chat_message)

    def on_close(self):
        # При отключении удаляем клиента из списка
        connected_clients.remove(self)
        user_names.pop(self, None)
        self.broadcast_user_list()

    def broadcast_user_list(self):
        # Рассылка списка подключённых пользователей
        user_list = list(user_names.values())
        message = json.dumps({"type": "users", "users": user_list})
        for client in connected_clients:
            client.write_message(message)

    def check_origin(self, origin):
        return True

async def redis_listener():
    # Подписываемся на канал Redis
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("chat")

    # Обрабатываем входящие сообщения
    async for message in pubsub.listen():
        if message["type"] == "message":
            data = message["data"].decode("utf-8") if isinstance(message["data"], bytes) else message["data"]
            # Рассылаем сообщение всем подключённым клиентам
            for client in connected_clients:
                await client.write_message(data)

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("static/index.html")

def make_app():
    return tornado.web.Application([
        (r"/", MainHandler),
        (r"/ws", WebSocketHandler),
        (r"/static/(.*)", tornado.web.StaticFileHandler, {"path": "./static"}),
    ])

if __name__ == "__main__":
    app = make_app()
    app.listen(8888)

    # Запуск Redis слушателя в асинхронном цикле
    loop = asyncio.get_event_loop()
    loop.create_task(redis_listener())

    # Запуск Tornado
    tornado.ioloop.IOLoop.current().start()
