# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, HttpResponseRedirect, StreamingHttpResponse

from anthony_bi.sql import Order_info, NewTable

from json import dumps as encodeJSON
import random
from datetime import datetime
import time
import pandas as pd
import numpy as np

from anthony_bi.planwork import PlanWork, MACHINE, GROUPS, WORK
# Create your views here.

# 产生随机订单
START_TIME = time.mktime((2017,1,1,0,0,0,0,0,0))    #生成开始时间戳
END_TIME = time.mktime((2017,12,31,23,59,59,0,0,0))    #生成结束时间戳
saler_name = ['Ami', 'Tom', 'Jonh']
customer_name = ['A公司', 'B公司', 'C公司', 'x公司']
state_list =  ['new', 'process', 'finish']
category_list =  ['裤子', '短袖', '长袖', '大衣']
city_list = ["海门","鄂尔多斯","招远","舟山","齐齐哈尔","盐城","赤峰","青岛","乳山","金昌","泉州","莱西","日照","胶南","南通","拉萨","云浮","梅州","文登","上海","攀枝花","威海","承德","厦门","汕尾","潮州","丹东","太仓","曲靖","烟台","福州","瓦房店","即墨","抚顺","玉溪","张家口","阳泉","莱州","湖州","汕头","昆山","宁波","湛江","揭阳","荣成","连云港","葫芦岛","常熟","东莞","河源","淮安","泰州","南宁","营口","惠州","江阴","蓬莱","韶关","嘉峪关","广州","延安","太原","清远","中山","昆明","寿光","盘锦","长治","深圳","珠海","宿迁","咸阳","铜川","平度","佛山","海口","江门","章丘","肇庆","大连","临汾","吴江","石嘴山","沈阳","苏州","茂名","嘉兴","长春","胶州","银川","张家港","三门峡","锦州","南昌","柳州","三亚","自贡","吉林","阳江","泸州","西宁","宜宾","呼和浩特","成都","大同","镇江","桂林","张家界","宜兴","北海","西安","金坛","东营","牡丹江","遵义","绍兴","扬州","常州","潍坊","重庆","台州","南京","滨州","贵阳","无锡","本溪","克拉玛依","渭南","马鞍山","宝鸡","焦作","句容","北京","徐州","衡水","包头","绵阳","乌鲁木齐","枣庄","杭州","淄博","鞍山","溧阳","库尔勒","安阳","开封","济南","德阳","温州","九江","邯郸","临安","兰州","沧州","临沂","南充","天津","富阳","泰安","诸暨","郑州","哈尔滨","聊城","芜湖","唐山","平顶山","邢台","德州","济宁","荆州","宜昌","义乌","丽水","洛阳","秦皇岛","株洲","石家庄","莱芜","常德","保定","湘潭","金华","岳阳","长沙","衢州","廊坊","菏泽","合肥","武汉","大庆"]
provency = ["广东", "广西", "云南", "江西", "贵州", "海南", "湖北", "湖南", "黑龙江", "吉林", "辽宁","上海", "新疆", "西藏", "内蒙古", "甘肃", "青海", "四川", "山西", "福建", "台湾", "山东"]

def home(request):
    return render(request, 'index.html')

# 添加数据
def add_order_date(request):
    for i in range(0, 5):
        timestamp=time.strftime("%Y-%m-%d %H:%M:%S",time.localtime(random.randint(START_TIME,END_TIME)))
        order = Order_info(
            saler=saler_name[random.randint(0,2)],
            customer=customer_name[random.randint(0,3)],
            created=timestamp,
            updated=timestamp,
            state=state_list[random.randint(0,2)],
            price=random.randint(1000,5000)
        )
        order.save()

        c_order = NewTable(
            customer=customer_name[random.randint(0,3)],
            created=timestamp,
            updated=timestamp,
            city=provency[random.randint(0,len(provency)-1)],
            category=category_list[random.randint(0,3)],
            price=random.randint(1000,5000),
            qty=random.randint(100, 1000),
        )
        c_order.save()
    return HttpResponse(encodeJSON({'state': 20, 'message': 'OK'}), content_type="application/json")


# 展现DEMO数据
def show_demo(request):
    return render(request, 'show_demo.html')


# 展现数据（1）
def show_order(request):
    content = {
        'begin_date': request.GET.get('begin_date'),
        'end_date': request.GET.get('end_date'),
        'frequence': request.GET.get('frequence') or 0,
    }
    return render(request, 'order_demo.html', content)


# 展现数据（2）
def show_order_2(request):
    content = {
        'begin_date': request.GET.get('begin_date'),
        'end_date': request.GET.get('end_date'),
    }
    return render(request, 'order_demo_2.html', content)


# 拿取数据
def api_order_info(request):
    # 时间筛选
    if request.GET.get('begin_date') and request.GET.get('end_date'):
        orders = Order_info().filter(created_gte=request.GET.get('begin_date'),created_lte=request.GET.get('end_date'))
    else:
        if request.GET.get('end_date'):
            orders = Order_info().filter(created_lte=request.GET.get('end_date'))
        elif request.GET.get('begin_date'):
            orders = Order_info().filter(created_gte=request.GET.get('begin_date'))
        else:
            orders = Order_info().get_all()

    # 按时间分类
    new_order = orders.set_index('created')

    orders['updated'] = orders['updated'].apply(lambda x: x.strftime('%Y-%m-%d %H:%M:%S'))
    orders['created'] = orders['created'].apply(lambda x: x.strftime('%Y-%m-%d %H:%M:%S'))
    # 表格数据
    content = {
        'table_data': orders.to_dict(orient='records')
    }
    content['companys'] = list(orders['customer'].value_counts().to_dict().keys())
    content['price'] = sum(orders['price'])
    # 不同客户数据分开
    new_order = new_order['2017']
    for company in content['companys']:
        content[company] = ['0']*12
        price_by_month = new_order[new_order['customer'] == company].resample('M')['price'].sum().fillna(0).to_dict()
        #print(company, '---------')
        for key, value in price_by_month.items():
            #print(key)
            content[company][key.month-1] = value
    
    # 汇总
    content['total_price'] = ['0']*12
    tmp_by_month = new_order.resample('M')['price'].sum().fillna(0).to_dict()
    #print('------total------')
    for key, value in tmp_by_month.items():
        #print(key.month, value)
        content['total_price'][key.month-1] = value

    return HttpResponse(encodeJSON({'data': content, 'status': 0, 'message': 'OK'}),content_type='application/json')


def api_show_data(request):
    if request.GET.get('begin_date'):
        begin_date = request.GET.get('begin_date')
        orders = Order_info().filter(created_gte=begin_date)
    else:
        orders = Order_info().get_all()
    # orders['updated'] = orders['updated'].apply(lambda x: x.strftime('%Y-%m-%d %H:%M:%S'))
    # orders['created'] = orders['created'].apply(lambda x: x.strftime('%Y-%m-%d %H:%M:%S'))
    # 总金额

    cg = orders.groupby('customer')
    res = cg['price'].sum().to_dict()
    content = {
        'companys': list(res.keys()),
        'total_price': list(res.values()),
        'total': sum(res.values()),
    }

    # 订单数量
    res = orders['customer'].value_counts().to_dict()
    content['orders_by_companys'] = [{'name': k, 'value': v} for k, v in res.items()]
    content['total_order'] = sum(res.values())

    # 状态
    states = list(orders['state'].value_counts().to_dict().keys())
    content['orders_by_states'] = list()
    for company in content['companys']:
        tmp_dict = orders[orders['customer'] == company]['state'].value_counts().to_dict()
        content['orders_by_states'] += [{'name': k, 'value': v} for k, v in tmp_dict.items()]
    # print(content)
    return HttpResponse(encodeJSON({'data': content, 'status': 0, 'message': 'OK'}),content_type='application/json')


def api_show_c_data(request):
    c_data = NewTable().get_all()
    # c_data.to_excel('test.xlsx')
    # c_data['created'] = c_data['created'].apply(lambda x: x.strftime('%Y-%m-%d %H:%M:%S'))
    # c_data['updated'] = c_data['updated'].apply(lambda x: x.strftime('%Y-%m-%d %H:%M:%S'))
    cg = c_data.groupby('category')
    res = cg['price'].sum().to_dict()

    content = {
        'category': list(res.keys()),
        'price': [{'name':k, 'value': v} for k, v in res.items()],
        'total_price': sum(res.values()),
    }

    res = cg['qty'].sum().to_dict()
    content['qty'] = list(res.values())
    content['total_num'] = sum(res.values())

    # 城市
    cg = c_data.groupby(['category', 'city'])
    res = cg['qty'].sum().to_dict()
    for category in content['category']:
        content[category] = list()

    for key, value in res.items():
        content[key[0]].append({'name': key[1], 'value': value})

    return HttpResponse(encodeJSON({'data': content, 'status': 0, 'message': 'OK'}),content_type='application/json')


def api_show_plan(request):
    df = pd.read_json(encodeJSON(WORK))
    new_plan = PlanWork(df, MACHINE, GROUPS['B'], 500)
    res = new_plan.find_best_result()
    content = {
        'default_time':new_plan.default_res['max_time'],
        'default_variance':new_plan.default_res['variance'],
        'reslut': res
    }
    
    return HttpResponse(encodeJSON({'data': content, 'status': 0, 'message': 'OK'}),content_type='application/json')
