from datetime import datetime
import os
from sql import Order_info, NewTable
from apscheduler.schedulers.blocking import BlockingScheduler
import time
import random


saler_name = ['Ami', 'Tom', 'Jonh']
customer_name = ['A公司', 'B公司', 'C公司', 'x公司']
state_list =  ['new', 'process', 'finish']
category_list =  ['裤子', '短袖', '长袖', '大衣']
city_list = ["海门","鄂尔多斯","招远","舟山","齐齐哈尔","盐城","赤峰","青岛","乳山","金昌","泉州","莱西","日照","胶南","南通","拉萨","云浮","梅州","文登","上海","攀枝花","威海","承德","厦门","汕尾","潮州","丹东","太仓","曲靖","烟台","福州","瓦房店","即墨","抚顺","玉溪","张家口","阳泉","莱州","湖州","汕头","昆山","宁波","湛江","揭阳","荣成","连云港","葫芦岛","常熟","东莞","河源","淮安","泰州","南宁","营口","惠州","江阴","蓬莱","韶关","嘉峪关","广州","延安","太原","清远","中山","昆明","寿光","盘锦","长治","深圳","珠海","宿迁","咸阳","铜川","平度","佛山","海口","江门","章丘","肇庆","大连","临汾","吴江","石嘴山","沈阳","苏州","茂名","嘉兴","长春","胶州","银川","张家港","三门峡","锦州","南昌","柳州","三亚","自贡","吉林","阳江","泸州","西宁","宜宾","呼和浩特","成都","大同","镇江","桂林","张家界","宜兴","北海","西安","金坛","东营","牡丹江","遵义","绍兴","扬州","常州","潍坊","重庆","台州","南京","滨州","贵阳","无锡","本溪","克拉玛依","渭南","马鞍山","宝鸡","焦作","句容","北京","徐州","衡水","包头","绵阳","乌鲁木齐","枣庄","杭州","淄博","鞍山","溧阳","库尔勒","安阳","开封","济南","德阳","温州","九江","邯郸","临安","兰州","沧州","临沂","南充","天津","富阳","泰安","诸暨","郑州","哈尔滨","聊城","芜湖","唐山","平顶山","邢台","德州","济宁","荆州","宜昌","义乌","丽水","洛阳","秦皇岛","株洲","石家庄","莱芜","常德","保定","湘潭","金华","岳阳","长沙","衢州","廊坊","菏泽","合肥","武汉","大庆"]
provency = ["广东", "广西", "云南", "江西", "贵州", "海南", "湖北", "湖南", "黑龙江", "吉林", "辽宁","上海", "新疆", "西藏", "内蒙古", "甘肃", "青海", "四川", "山西", "福建", "台湾", "山东"]


# 添加数据
def add_order_date():
	# 产生随机订单
	START_TIME = time.mktime((2017,1,1,0,0,0,0,0,0))    #生成开始时间戳
	END_TIME = time.mktime((2017,12,31,23,59,59,0,0,0))    #生成结束时间戳
    
    print('tick: {}'.format(START_TIME))

    for i in range(0, 2):
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

if __name__ == '__main__':
    scheduler = BlockingScheduler()
    scheduler.add_executor('processpool')
    scheduler.add_job(add_order_date, 'interval', seconds=10)

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        pass
