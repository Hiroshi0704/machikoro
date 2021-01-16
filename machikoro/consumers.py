import json
from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync
# from channels.asgi import get_channel_layer


class MachikoroConsumer(WebsocketConsumer):
    def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = 'chat_%s' % self.room_name

        # Join room group
        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name,
            self.channel_name
        )

        self.accept()
        async_to_sync(self.add_channel_names)(
            self.room_group_name,
            self.channel_name
        )

        context = {
            'type': 'channel_name_message',
            'message': {
                'channel_name': self.channel_name,
                'channels': [key for key in self.channel_layer.groups[self.room_group_name].keys()]
            }
        }
        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            context
        )

    async def add_channel_names(self, group, channel_name):
        if not hasattr(self.channel_layer, 'groups'):
            self.channel_layer.groups = {}

        if group not in self.channel_layer.groups:
            self.channel_layer.groups[group] = {}

        if channel_name not in self.channel_layer.groups[group]:
            self.channel_layer.groups[group][channel_name] = ''

        print(self.channel_layer.groups[group])


    async def del_channel_names(self, group, channel_name):
        if not hasattr(self.channel_layer, 'groups'):
            return

        if group not in self.channel_layer.groups:
            return

        if channel_name in self.channel_layer.groups[group]:
            del self.channel_layer.groups[group][channel_name]

    def disconnect(self, close_code):
        # Leave room group
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name,
            self.channel_name
        )

        async_to_sync(self.del_channel_names)(
            self.room_group_name,
            self.channel_name
        )

     # Receive message from WebSocket
    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        context = {
            'type': 'game_message',
            'game': ''
        }

        if 'gameStart' in text_data_json:
            context['type'] = 'game_start_message'
            context['message'] = text_data_json['gameStart']

        if 'game' in text_data_json:
            context['type'] = 'game_message'
            context['message'] = text_data_json['game']

        if 'log' in text_data_json:
            context['type'] = 'log_message'
            context['message'] = text_data_json['log']

        if 'logDiceNumber' in text_data_json:
            context['type'] = 'log_dice_number_message'
            context['message'] = text_data_json['logDiceNumber']

        if 'updatePlayers' in text_data_json:
            context['type'] = 'update_players_message'
            context['message'] = text_data_json['updatePlayers']

        if 'joinPlayer' in text_data_json:
            context['type'] = 'join_player_message'
            context['message'] = text_data_json['joinPlayer']


        # Send message to room group
        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            context
        )

    # Receive message from room group
    def game_message(self, event):
        message = event['message']

        # Send message to WebSocket
        self.send(text_data=json.dumps({
            'game': message
        }))

    # Receive message from room group
    def log_message(self, event):
        message = event['message']

        # Send message to WebSocket
        self.send(text_data=json.dumps({
            'log': message
        }))

    # Receive message from room group
    def log_dice_number_message(self, event):
        message = event['message']

        # Send message to WebSocket
        self.send(text_data=json.dumps({
            'logDiceNumber': message
        }))

    # Receive message from room group
    def game_start_message(self, event):
        message = event['message']

        # Send message to WebSocket
        self.send(text_data=json.dumps({
            'gameStart': message
        }))

    def update_players_message(self, event):
        message = event['message']

        # Send message to WebSocket
        self.send(text_data=json.dumps({
            'updatePlayers': message
        }))

    def join_player_message(self, event):
        message = event['message']

        # Send message to WebSocket
        self.send(text_data=json.dumps({
            'joinPlayer': message
        }))

    def channel_name_message(self, event):
        message = event['message']
        self.send(text_data=json.dumps(message))
