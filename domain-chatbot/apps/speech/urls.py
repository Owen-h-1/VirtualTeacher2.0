from django.urls import path
from . import views

urlpatterns = [
    path('tts/generate', views.generate, name='generate'),
    path('tts/generate-stream', views.generate_stream, name='generate_stream'),
    path('tts/voices', views.get_voices, name='voices'),
    path('tts/types', views.get_tts_types, name='tts_types'),
    path('translation', views.translation, name='translation'),
]
