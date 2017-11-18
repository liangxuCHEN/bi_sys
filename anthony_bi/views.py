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
customer_name = ['A公司', 'B公司', 'C公司', 'x公司']
state_list =  ['new', 'process', 'finish']


def home(request):
    return render(request, 'index.html')


def add_order_date(request):
    timestamp = datetime.today().strftime("%Y-%m-%d %H:%M:%S") 
    order = Order_info(
        saler=saler_name[random.randint(0,2)],
        customer=customer_name[random.randint(0,3)],
        created=timestamp,
        updated=timestamp,
        state=state_list[random.randint(0,2)],
        price=random.randint(1000,5000)
    )
    order.save()
    return HttpResponse(json.dumps({'state': 20, 'message': 'OK'}), content_type="application/json")


def show_order(request):
	return render(request, 'order_demo.html')


def api_show_data(request):
    orders = Order_info().get_all()
    # orders['updated'] = orders['updated'].apply(lambda x: x.strftime('%Y-%m-%d %H:%M:%S'))
    # orders['created'] = orders['created'].apply(lambda x: x.strftime('%Y-%m-%d %H:%M:%S'))
    # 总金额
    cg = orders.groupby('customer')
    res = cg['price'].sum().to_dict()
    content = {
        'companys': res.keys(),
        'total_price': res.values(),
        'total': sum(res.values()),
    }

    # 订单数量
    res = orders['customer'].value_counts().to_dict()
    content['orders_by_companys'] = [{'name': k, 'value': v} for k, v in res.items()]
    content['total_order'] = sum(res.values())

    # 状态
    states = orders['state'].value_counts().to_dict().keys()
    content['orders_by_states'] = list()
    for company in content['companys']:
    	tmp_dict = orders[orders['customer'] == company]['state'].value_counts().to_dict()
    	content['orders_by_states'] += [{'name': k, 'value': v} for k, v in tmp_dict.items()]

    return HttpResponse(json.dumps({'data': content, 'status': 0, 'message': 'OK'}),content_type='application/json')
