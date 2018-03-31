import pandas as pd
import numpy as np
import itertools
import pymssql
from random import randint
import time
#temp var
#机器数量
MACHINE = {
    'm1':4,
    'm2':10,
    'm3':6,
    'm4':7,
    'm5':6,
    'm6':10,
}

#组别-默认人员配置
# '机器编号':[单工种工人数量,全能工人数量]

GROUPS = {
    'A':{
        'm1':[3,0],
        'm2':[5,1],
        'm3':[4,0],
        'm4':[4,1],
        'm5':[2,2],
        'm6':[5,2],
    },
    'B':{
        'm1':[4,1],
        'm2':[5,2],
        'm3':[4,1],
        'm4':[3,1],
        'm5':[2,2],
        'm6':[5,2],
    },
}

#工艺数据
WORK = [
    {'id': 'GX0001', 'machine': 'm6', 'time': 4},
    {'id': 'GX0002', 'machine': 'm4', 'time': 3},
    {'id': 'GX0003', 'machine': 'm3', 'time': 4},
    {'id': 'GX0004', 'machine': 'm4', 'time': 1},
    {'id': 'GX0005', 'machine': 'm5', 'time': 2},
    {'id': 'GX0006', 'machine': 'm2', 'time': 4},
    {'id': 'GX0007', 'machine': 'm1', 'time': 2},
    {'id': 'GX0008', 'machine': 'm2', 'time': 1},
    {'id': 'GX0009', 'machine': 'm3', 'time': 4},
    {'id': 'GX0010', 'machine': 'm4', 'time': 2},
    {'id': 'GX0011', 'machine': 'm5', 'time': 4},
    {'id': 'GX0012', 'machine': 'm4', 'time': 5},
    {'id': 'GX0013', 'machine': 'm1', 'time': 4},
    {'id': 'GX0014', 'machine': 'm2', 'time': 1},
    {'id': 'GX0015', 'machine': 'm2', 'time': 5},
    {'id': 'GX0016', 'machine': 'm6', 'time': 4},
    {'id': 'GX0017', 'machine': 'm6', 'time': 1},
    {'id': 'GX0018', 'machine': 'm2', 'time': 4},
    {'id': 'GX0019', 'machine': 'm3', 'time': 3},
    {'id': 'GX0020', 'machine': 'm2', 'time': 1},
    {'id': 'GX0021', 'machine': 'm6', 'time': 4},
    {'id': 'GX0022', 'machine': 'm2', 'time': 3},
    {'id': 'GX0023', 'machine': 'm4', 'time': 7},
    {'id': 'GX0024', 'machine': 'm4', 'time': 1},
    {'id': 'GX0025', 'machine': 'm2', 'time': 4}]


def connect_sql():
    conn= pymssql.connect(
        host='192.168.0.209',
        port=1433,
        user='sa',
        password='123456',
        database='Antonio1.0',
        charset="utf8"
    )
    return conn


class PlanWork(object):
    """
    根据工艺单数据和车间人数, 安排合适的人去每个工作岗位
    """
    def __init__(self, df_work, machine, produce_group, qty):

        self.df_work = df_work     # 工艺单
        self.machine = machine     # 机械数量表
        self.group = produce_group       # 组员默认分配表
        self.qty = qty             # 生产数量
        self.machine_time = self.time_per_machine()
        self.default_res = self.calc_max_time()
        self.group_detial = self.get_pure_group()
        self.number_machine =len(self.machine)  #机器数量,分组类别数量
        self.plans = self.get_plans()
        self.best_plan = None

    def time_per_machine(self):
        return self.df_work.groupby('machine')['time'].sum().to_dict()

    
    def calc_max_time(self, group=None):
        if not group:
            group = self.group
        # 记录每个机器用时,找最大用时
        res = []
        for m_key, use_time in self.machine_time.items():
            # 判断机器和人哪个小,使用哪个
            num_person = sum(group[m_key])
            power = num_person if num_person < self.machine[m_key] else  self.machine[m_key]
            res.append(float(self.qty * use_time / power))
      
        return {'max_time':max(res), 'variance':np.var(res)}


    def get_pure_group(self):
        """找到每组单技能人数量, 找到总的全能人总数"""
        pure_group = {}
        super_mans = 0 #全能的人
        key_list = []
        for key, val in self.group.items():
            super_mans += val[1]
            pure_group[key] = [val[0], 0]
            key_list.append(key)

        return {'pure_group':pure_group, 'super_mans':super_mans, 'keys':key_list}


    def get_plans(self):
        """找出所有排列可能"""

        plans = set()
         
        for p in itertools.combinations_with_replacement(range(self.group_detial['super_mans']+1),len(self.machine)):
            # 穷举
            if sum(p) == self.group_detial['super_mans']: #调动人数总和要一致,组合没有重复
                x = set(p)
                has_same = False

                for h in plans:
                    if not x.difference(set(h)):
                        has_same = True
                        break

                if not has_same:
                    for m in set(itertools.permutations(p, len(p))):
                        if not m in plans:
                            plans.add(m)
        return plans


    def find_best_result(self):
        if not self.best_plan:
           self.best_plan = {
               'plan':self.group,
                   'use_time': self.default_res['max_time'],
                   'variance': self.default_res['variance'],
               }

        pure_group = self.group_detial['pure_group']
        keys = self.group_detial['keys']

        for plan in self.plans:
            for i in range(0, self.number_machine):
                pure_group[keys[i]][1] = plan[i]

            tmp_res = self.calc_max_time(group=pure_group)
            #print(tmp_res['max_time'])
            #print(pure_group)
            if self.best_plan['use_time'] > tmp_res['max_time']:
                self.best_plan['plan'] = plan
                self.best_plan['use_time'] = tmp_res['max_time']
                self.best_plan['variance'] = tmp_res['variance']


        return self.best_plan



def work_stage():
    conn = connect_sql()
    sql_text = "SELECT TOP 30 WorkStageID as id, WorkStageName, Machine as machine, SMVTime as time FROM WorkStage;"
    print(sql_text)
    try:
        df = pd.io.sql.read_sql(sql_text, con=conn)
        return df
    except Exception as e:
        print(e)



if __name__ == '__main__':
    df = work_stage()

    # 机器数量
    machine_num = df.groupby('machine').size() + 4

    # 分组情况
    group = {}
    for g_name in 'ABCDE':
        group[g_name] = {}
        for i in range(0, len(machine_num)):
            group[g_name][machine_num.index[i]]=[randint(1, machine_num[i]-2),  randint(0,1)]

    print(machine_num)
    start = time.clock()
    print('========开始计算=========')
    new_plan = PlanWork(df, machine_num, group['B'], 1)
    end = time.clock()
    print('一共有%d方案' % len(new_plan.plans))
    print('用时:', end-start)
    print('一共有超人%d个' % new_plan.group_detial['super_mans'])
    print('机型工序时间汇总:', new_plan.machine_time)
    start = time.clock()
    res = new_plan.find_best_result()
    end = time.clock()
    print('选择方案用时:' , end - start)
    print('========默认分配========')

    print('默认配置时间:', new_plan.default_res['max_time'])

    for key, val in new_plan.group.items():
        print('机器:{}--->配置 {} 人 (包含:{} 超人)'.format(key, sum(val), val[1]))
    print('========具体分配========')
    print('最佳配置时间:', new_plan.best_plan['use_time'])
    i = 0
    for key, val in new_plan.group.items():
        print('机器:{}--->配置 {} 人 (包含:{} 超人)'.format(key, res['plan'][i]+val[0], res['plan'][i]))
        i += 1



