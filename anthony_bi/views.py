# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, HttpResponseRedirect, StreamingHttpResponse

from anthony_bi.sql import Order_info

import json
import random
from datetime import datetime
# Create your views here.
saler_name = ['Ami', 'Tom', 'Jonh']
customer_name = ['A company', 'B company', 'C company']
state_list =  ['new', 'process', 'finish']


def add_order_date(request):
    timestamp = datetime.today().strftime("%Y-%m-%d %H:%M:%S") 
    order = Order_info(
        saler=saler_name[random.randint(0,2)],
        customer=customer_name[random.randint(0,2)],
        created=timestamp,
        updated=timestamp,
        state=state_list[random.randint(0,2)],
        price=random.randint(1000,5000)
    )
    order.save()
    return HttpResponse(json.dumps({'state': 20, 'message': 'OK'}), content_type="application/json")


def show_order_date(request):
    #orders = Order_info().get_all()
    #res = orders.to_dist(orient='records')
    #return HttpResponse(json.dumps({'data': res, 'status': 0, 'message': 'OK'}), content_type="application/json")
    return render(request, 'order_demo.html')