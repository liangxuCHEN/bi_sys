"""data_sc URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.11/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import url
from django.contrib import admin
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from anthony_bi import views

urlpatterns = [
    
    url(r'^admin/', admin.site.urls),
    
    # HTML
    url(r'^$',views.home, name='home'),
    url(r'^add_order_date', views.add_order_date, name='add_order_date'),
    url(r'^show_order$', views.show_order, name='show_order'),
    url(r'^show_order_2', views.show_order_2, name='show_order_2'),
    url(r'^show_demo', views.show_demo, name='show_demo'),

    # API
    url(r'^api_order_info', views.api_order_info, name='api_order_info'),
    url(r'^api_show_data', views.api_show_data, name='api_show_data'),
    url(r'^api_show_c_data', views.api_show_c_data, name='api_show_c_data'),
]

urlpatterns += staticfiles_urlpatterns()