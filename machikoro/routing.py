from channels.routing import route

channel_routing = [
    route("http.request", "machikoro.consumers.http_consumer"),
]
