# coding=utf8
import numpy as np
import pymssql
import pandas as pd



# connection = pymssql.connect(**config_mssql)

# self.db = {
#           'host': '192.168.0.10',
#           'port': 1433,
#           'user': 'crm_bk',
#           'password': 'bk@123456',
#           'database': 'CRM_BAYKEE',
#           'charset': 'utf8'
#         }

class Field(object):

    def __init__(self, name, column_type):
        self.name = name
        self.column_type = column_type

    def __str__(self):
        return '<%s:%s>' % (self.__class__.__name__, self.name)


# 创建StringField和IntergerField
class StringField(Field):

    def __init__(self, name):
        super(StringField, self).__init__(name, 'varchar(100)')


class IntegerField(Field):

    def __init__(self, name):
        super(IntegerField, self).__init__(name, 'bigint')


# Model元类
class ModelMetaclass(type):

    def __new__(mcs, name, bases, attrs):
        if name == 'Model':
            return type.__new__(mcs, name, bases, attrs)
        # print('Found model: %s' % name)
        mappings = dict()

        for k, v in attrs.items():
            if isinstance(v, Field):
                # print('Found mapping: %s ==> %s' % (k, v))
                mappings[k] = v

        for k in mappings.keys():
            attrs.pop(k)

        attrs['__mappings__'] = mappings  # 保存属性和列的映射
        attrs['__table__'] = name  # 表明

        return type.__new__(mcs, name, bases, attrs)


class Model(dict, metaclass=ModelMetaclass): # python 3.x 以上
#class Model(dict):
    #__metaclass__ = ModelMetaclass
    def __init__(self, **kwargs):
        self.db = {
                  'host': '192.168.0.10',
                  'port': 1433,
                  'user': 'crm_bk',
                  'password': 'bk@123456',
                  'database': 'CRM_BAYKEE',
                  'charset': 'utf8'
                }
        super(Model, self).__init__(**kwargs)

    def __getattr__(self, item):
        try:
            return self[item]
        except KeyError:
            raise AttributeError("'model' object has no attribute '%s'" % item)

    def __setattr__(self, key, value):
        # print('key : %s, value: %%' % key, value)
        self[key] = value

    
    def __getConnect(self):
        """
        得到连接信息
        返回: conn.cursor()
        """
        if not self.db:
            raise(NameError,"没有设置数据库信息")
        self.conn = pymssql.connect(**self.db)
        cur = self.conn.cursor()
        if not cur:
            raise(NameError,"连接数据库失败")
        else:
            return cur

    def save(self):
        fields = []
        args = []
        for k, v in self.__mappings__.items():
            fields.append(v.name)
            args.append(getattr(self, k, None))

        values = ''
        for i in args:
            if type(i) != type(0):
                values += "'%s'" % i
            else:
                values += "%d" % i

            values += ','

        sql = 'INSERT INTO %s(%s) VALUES (%s)' % (self.__table__, ','.join(fields), values[:-1])
        print('SQL: %s' % sql)
        try:
            with self.__getConnect() as cursor:
                cursor.execute(sql)

            # 主动提交，以保存所执行的语句
            self.conn.commit()
            self.conn.close()

        except Exception as e:
            print('save error:', e)
        # print('ARGS: %s' % str(args))

    def filter(self, **kwargs):
        # 是否有order_by
        order_by = ''
        if kwargs.get('order_by'):
            order_by = "ORDER BY %s" % ','.join(kwargs['order_by'])
            kwargs.pop('order_by')
        if kwargs.get('order_by_desc'):
            order_by = "ORDER BY %s" % ' DESC,'.join(kwargs['order_by_desc'])
            kwargs.pop('order_by_desc')
        fields = []
        for k, v in kwargs.items():
                if '_' in k:
                    tmp_words = k.split('_')
                    key = '_'.join(tmp_words[:-1])
                    if key in self.__mappings__.keys() or key == 'id':
                        func = tmp_words[-1]
                        if func == 'contains':
                            fields.append("{key} like '%{value}%'".format(key=key, value=v))
                        if func == 'lte':
                            if type(v) == type(0):
                                fields.append("{key} <= {value}".format(key=key, value=v))
                            else:
                                fields.append("{key} <= '{value}'".format(key=key, value=v))
                        if func == 'gte':
                            if type(v) == type(0):
                                fields.append("{key} >= {value}".format(key=key, value=v))
                            else:
                                fields.append("{key} >= '{value}'".format(key=key, value=v))
                    else:
                        raise AttributeError("'model' object has no attribute '%s'" % key)
                else:
                    if k in self.__mappings__.keys() or key == 'id':
                        fields.append("%s='%s'" % (k, v))
                    else:
                        raise AttributeError("'model' object has no attribute '%s'" % k)

        sql = 'SELECT * From %s WHERE %s %s' % (self.__table__, ' and '.join(fields), order_by)
        print(sql)
        try:
            cur = self.__getConnect()
            res = pd.read_sql(sql, con=self.conn)
            self.conn.close()
            return res
        except Exception as e:
            print('filter error:', e)
        return None


    def get_all(self, **kwargs):
        sql = 'SELECT * From %s ' % (self.__table__)
        print(sql)
        try:
            cur = self.__getConnect()
            res = pd.read_sql(sql, con=self.conn)
            self.conn.close()
            return res
        except Exception as e:
            print('get_all error:', e)
        return None


class LX_Test(Model):
    name = StringField('name')
    age = IntegerField('age')


class NewTable(Model):
    # 类别-价格
    category = StringField('category')
    customer = StringField('customer')
    created = StringField('created')
    updated = StringField('updated')
    city = StringField('city')
    price = IntegerField('price')
    qty = IntegerField('qty')


class Order_info(Model):
    saler = StringField('saler')
    customer = StringField('customer')
    created = StringField('created')
    updated = StringField('updated')
    state = StringField('state')
    price = IntegerField('price')


def save_test():
    #j = Job(job_name='My Job', price=500, total_num=1000)
    #j.save()

    u = LX_Test(name='11xoos', age=16)
    u.save()

def get_test():
    # u = LX_Test().filter(email_contains='@', order_by_desc=['id', 'name'])
    # u = LX_Test().filter(name='11xoos')
    u = NewTable().filter(created_gte='2017-11-20')
    #u = NewTable().get_all()
    # U 返回D ataFate， 继续做逻辑处理，
    # 最后返回Json结构数据
    #res = u.to_json(orient='records')
    res = len(u)
    #res = u.to_dict(orient='records')
    print({'data': res, 'status': 0, 'message': 'OK'})


if __name__ == '__main__':
    # save_test()
    get_test()

