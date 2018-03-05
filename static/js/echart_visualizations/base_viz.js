const base_dashboard_url = '/superset/dashboard_json/'
const base_slice_url = '/superset/explore_json/table/'

const dashboard_title_id = '#dashboard_title'
const dashboard_content_id = '#data_dash'

const slice_height_unit = 110

//echart 图表参数 - 统一风格
const text_color = "#fff"
const background_color = "#333"
const colors=['#fad797','#59ccf7','#c3b4df']

//echart风格
const chart_style = 'dark' //html要相应引入主题js文件


//TODO: 拆分一下不同参数
const current_url = decodeURI(window.location.href)

var verbose_map  //存放列名的别名

//时间粒度
const time_grain = [
  ['second', '每秒'],
  ['minute', '每分钟'],
  ['5 minute', '每5分钟'],
  ['half hour', '每半小时'],
  ['hour', '每小时'],
  ['day', '每天'],
  ['week', '每周'],
  ['month', '每月'],
  ['quarter', '每季度'],
  ['year', '每年']
]


var filter_paramets = []
var filter_form = {}
var time_filter = {}

//排序函数
function sortNumber(a,b){
  return a - b
}

 if (current_url.indexOf('?') > -1){
    var paramets = current_url.split('?')[1].split('&')
    paramets.forEach(function(val, index, arr){
        var v = val.split('=')

        if (v[1] !== '') {
            //不是时间参数,暂时单选
            //TODO: 多选
            if (v[0]!=='since' && v[0]!=='until' && v[0]!=='time_grain_sqla') {
                filter_paramets.push({
                  col:v[0],
                  op:"in",
                  val:[v[1]]
              })
              filter_form[v[0]] = v[1]
            } else {
              //时间参数
              //console.log('time filter', v)
              time_filter[v[0]] = v[1]
            }
            
        }
        
    })
 }

function read_dashboard(dashboard_id) {
     
    var get_dashboat_url

    var slice_width_unit = Math.floor(document.documentElement.clientWidth / 12) - 1
    //请求数据
    $.get(base_dashboard_url + dashboard_id).done(function (response) {
        // 先拿这个图表的参数
        console.log(response)
        //初始化
        $(dashboard_title_id).children().remove()

        //访问禁止
        if (response.dashboard == undefined) {
          alert("没有权限访问，请联系管理员"); 
          window.location.href="/superset/welcome"
          return
        }
        //权限问题提醒
        if (response.dashboard.status == 401) {
            $(dashboard_title_id).append('<div class="alert alert-warning" role="alert">'+ response.dashboard.message +'<a href="/superset/welcome"> 返回首页</a></div>')
            return
        }
        
        //其他错误
        if (response.dashboard.status !== undefined) {
            $(dashboard_title_id).append('<div class="alert alert-warning" role="alert">数据加载失败</div>')
            return
        }

        //标题
        $(dashboard_title_id).append('<h2  style="margin-left: 10px">'+response.dashboard.dashboard_title+'</h2>')

        //每个slice
        response.dashboard.slices.forEach(function(val,index, arr){
            
            //postition顺序和slice顺序不一样
            var position
            for (var i = 0; i <= response.dashboard.position_json.length; i++) {
                if (response.dashboard.position_json[i].slice_id == val.slice_id) {
                    position = response.dashboard.position_json[i]
                    break
                }
            }
            //位置,有可能没有postion,但我们在设计的时候尽量避免这样情况出现
            if (position == undefined) {
                position = {
                    col:1,
                    row:0,
                    size_x:4,
                    size_y:4,
                }
            }
            
            //console.log(position)

            var table_id = val.form_data.datasource.split('__')[0]

            var form_data = val.form_data

            if (val.form_data.viz_type !== "filter_box") {
              if(filter_paramets.length > 0){
                  form_data.extra_filters = filter_paramets                
              }
              //时间参数
              for(var key in time_filter) {
                form_data[key] = time_filter[key]
              }

            }
            

            var url = base_slice_url + table_id  + '?form_data=' + JSON.stringify(val.form_data)

            //console.log(url)
            //TODO:这里是异步请求，放回数据有先后，顺势有区别，需要用postition来调整参数
            verbose_map =  response.verbose_map

            add_slice(position, url, val.slice_name, slice_width_unit)
        })
   }).fail(function(){
     $(dashboard_title_id).append('<div class="alert alert-warning" role="alert">数据加载失败</div>')
   })
}


function add_slice(position, url, slice_name, slice_width_unit) {
  
    //console.log(response)
    var slice_id = 'slice_cell' + position['slice_id']
    var slice_height = slice_height_unit * position['size_y']
    var slice_width = slice_width_unit * position['size_x']
    var slice_top = slice_height_unit  * position['row'] + 98
    var slice_left = slice_width_unit * (position['col'] - 1) + 5
    
    $.get(url).done(function (response) {

        console.log(response)
        
        //全屏定位
        //移动端定位-每个图一栏
        if (document.documentElement.clientWidth > 600) {
            $(dashboard_content_id).append('<div style="position: absolute;width:'+
                slice_width+'px;height:'+
                slice_height+'px;left:'+
                slice_left+'px;top:'+
                slice_top+'px;"><div id="'+
                slice_id +'" style="height:'+
                (slice_height-2)+'px;width:'+
                (slice_width-2)+'px;"></div></div>'
            )
        } else {
            $(dashboard_content_id).append('<div class="row" style="margin: 1px 5px 1px 5px"><div id="'+
                slice_id +'" style="height:'+
                (slice_height-2)+'px;"></div></div>'
            )
        }
        
        console.log(response.form_data.viz_type)

        switch(response.form_data.viz_type){
            // 做表单
            case 'filter_box':
              form_dom = generate_form(response,　slice_name)
              $('#'+slice_id).append(form_dom)
              break

            //做表
            case 'table':
              $('#'+slice_id).append('<table id="'+
                slice_id +'Table" class="table"></table>')
              $('#'+slice_id+'Table').bootstrapTable('destroy').bootstrapTable(generate_table(response,　slice_name, position['size_y']))
              $('#'+slice_id+'Table').bootstrapTable('hideLoading')
              break

            //标记和分割，不用请求数据，直接显示数据,暂时支持html
            case 'separator': case 'markup':
               $('#'+slice_id).append(response.data.html)
               break

            //画图
            default:
              // 高度留一点空隙
              $('#'+slice_id).css("margin-top", "5px")
              var myChart= echarts.init(document.getElementById(slice_id), chart_style)
              generate_chart(myChart, response,　slice_name)
        }

    }).fail(function(){
        $(dashboard_content_id).append('<div style="position: absolute;width:'+
            slice_width+'px;height:'+
            slice_height+'px;left:'+
            slice_left+'px;top:'+
            slice_top+'px;"><div id="'+
            slice_id +'" style="height:'+
            (slice_height-2)+'px;width:'+
            (slice_width-2)+'px;"><div style="margin: 1px 5px 1px 5px" class="alert alert-warning" role="alert">'+
            '数据加载失败</div></div></div>'
        )
    })

}

//表单
function generate_form(response,　slice_name) {
    var dom = '<form method="get"  role="form">'
    // 添加时间选项
    if (response.form_data.date_filter) {

      dom += '<label for=“since”> 开始时间 </label>'
      if(time_filter.since == undefined) {
        dom += '<input class="form-control" type="date" name="since">'
      } else {
        dom += '<input class="form-control" type="date" name="since" value="' + time_filter.since + '">'
      }


      dom += '<label for=“until”> 结束时间 </label>'

      if(time_filter.until == undefined) {
        dom += '<input class="form-control" type="date" name="until">'
      } else {
        dom += '<input class="form-control" type="date" name="until" value="' + time_filter.until + '">'
      }
    }

    //添加时间粒度
    if (response.form_data.show_sqla_time_granularity) {
      dom += '<label for=time_grain_sqla> 时间粒度 </label>'
      dom += '<select class="form-control" name="time_grain_sqla">'
      dom += '<option></option>'
      time_grain.forEach(function(val,index,arr) {
        if (time_filter.time_grain_sqla == val[0]) {
          dom += '<option value="'+ val[0] +'" selected = "selected">' + val[1] + '</option>'
        } else {
          dom += '<option value="'+ val[0] +'">' + val[1] + '</option>'
        }
      })
      dom += '</select>'
    }
    
    //添加筛选项  
    for (var i in response.data)  {
        dom += '<label for="'+ i +'">'+verbose_map[response.form_data.datasource][i]+'</label>'
        dom  += '<select class="form-control" name='+ i +'>'
        dom += '<option></option>'
        response.data[i].forEach(function(val,index,arr){
            if (filter_form[i] == val.id) {
               dom += '<option value="'+ val.id +'" selected = "selected">' + val.text + '</option>' 
            } else {
               dom += '<option value="'+ val.id +'">' + val.text + '</option>'     
            }
        })
        dom += '</select>'
    }
    dom += '<hr><button type="submit" class="btn-info">筛选</button>'
    dom += '</form>'
    return dom
}


//boostrap-table
function generate_table(response,　slice_name, pageSize) {

    function genarate_fileds(datas){
        var fields = [{field: '', title: '序号',formatter: function (value, row, index) {return index + 1;}}]
        datas.forEach(function(val, index, arr){
            fields.push({
                field: val,
                title: verbose_map[response.form_data.datasource][val]  || val, //别名转化
                sortable: true
            })
        })
        return fields
    }

    return table_option = {
        //search: true,
        pagination: true,
        pageNumber: 1,
        pageSize: pageSize*3 - 6 ,
        pageList: [10, 20, 30, 50],
        cache: false,
        //height:'80%',
        paginationPreText: "上一页",
        paginationNextText: "下一页",
        striped: true,
        showRefresh: false,
        //sortName:'CreateTime',
        //sortOrder:'desc',
        //showColumns:true,
        //toolbar: '#toolbar',
        //singleSelect: true,           // 单选checkbox
        //
        //showExport: true,     //下载
        //exportDataType: "all",
        //exportTypes: ['excel'],
        columns: genarate_fileds(response.data.columns),
        data: response.data.records,
    }

}

//基本柱状图数据
function generate_chart(mychart, data, slice_name) {
    //构建图表
    var option

    //console.log(data.form_data.viz_type)

    //TODO:后面不断添加其他图表类型
    switch(data.form_data.viz_type)
    {
        case 'dist_bar':
          option = dist_bar_viz(data.data,  data.form_data)
          break;
        case 'line':
          option = time_line_viz(data.data, data.form_data)
          break;
        case 'bar':
          option = time_line_viz(data.data, data.form_data)
          break;
        case 'area':
          option = time_line_viz(data.data, data.form_data, boundaryGap=false)
          break;
        case 'pie':
          option = pie_viz(data.data, data.form_data)
          break;
        case 'country_map':
          if (data.form_data.stat_unit == 'city') {
            option = china_city(data.data,data.form_data)
          } else {
            option = china_map(data.data)
          }
          break;
        case 'world_map':
          option = world_map(data.data)
          break;
        case 'big_number':
          option = big_number_viz(data.data, data.form_data)
          break;
        case 'big_number_total':
          option = big_number_total(data.data, data.form_data.y_axis_format)
          break;
        case 'word_cloud':
           option = word_cloud(data.data)
           break;        
        case 'treemap':
           option = treemap(data.data, data.form_data.datasource)
           break;
        case 'box_plot':
           option = box_plot(data.data, data.form_data)
           break;
        case 'bubble':
          if (data.form_data.stat_function == null) {
            option = bubble(data.data, data.form_data)
          } else {
            //其他类似方法
            switch(data.form_data.stat_function) {
              case 'clustering':
                option = clustering(data.data, data.form_data)
                break;
              default:
                option = regression(data.data, data.form_data)
            }
            
          }
           
           break;
        case 'cal_heatmap':
           option = cal_heatmap(data.data)
           break;
        case 'histogram':
           option = histogram(data.data)
           break;
        case 'sunburst':
           option = sunburst(data.data, data.form_data)
           break;
        case 'sankey':
           option = sankey(data.data)
           break;
        case 'directed_force':
           option = directed_force(data.data)
           break;
        case 'chord':
           option = chord(data.data)
           break;
        case 'para':
           option = parallel(data.data, data.form_data)
           break;
        case 'heatmap':
           option = heatmap(data.data, data.form_data)
           break;

        case 'pivot_table':
           option = pivot_table(data.data, data.form_data)
           break;

        case 'dual_line':
           option = dual_line(data.data, data.form_data)
           break;

        default:
          //option = china_map(data.data)
          option = {
            title:{
                //标题
                text: slice_name,
                textAlign: 'left',
                subtext: '暂时不支持这种类型图表:' + data.form_data.viz_type

            }
          }
          console.log('pass')
    }

    //图表共同参数的设置
    if (option.title == undefined) {
            option.title = {
            //标题
            text: slice_name,
            textAlign: 'left',

        }
    }

    option.toolbox = {  
        show : true,
        left: '85%',
        feature : {  
           saveAsImage: {show: true, title:'下载'},
           restore: {show: true},
           //dataZoom: {show: true}, //地图，热力图
        }  
    }

    switch(data.form_data.viz_type)
    {
        case 'dist_bar':
          option.toolbox.feature.magicType = {
            type: ['line', 'bar', 'stack', 'tiled']
          }
          break;
        case 'bar':
          option.toolbox.feature.magicType = {
            type: ['line', 'bar', 'stack', 'tiled']
          }
          option.dataZoom = {show:true}
          break;
        case 'line': 
          option.toolbox.feature.magicType = {
            type: ['line', 'bar', 'stack', 'tiled']
          }
          option.dataZoom = {show:true}
          break;

        case 'area': 
          option.dataZoom = {show:true}
          break;

        case 'pie':
          // option = pie_viz(df)
          console.log('pass')
          break;
        case 'country_map':
          // option = pie_viz(df)
          //mychart.on('brushselected', renderBrushed)
          console.log('pass')
          break;
        case 'big_number':
          option.title.push({
            text: slice_name,
            textAlign: 'left',
           })
          break;

        case 'big_number_total':
          option.title.push({
            text: slice_name,
            textAlign: 'left',
           })
          break;
        
        case 'box_plot':
          option.dataZoom = {show:true}
          break;
        case 'bubble':
            option.toolbox.feature.dataZoom = {}
            break;

        default:
           console.log('pass')
    }

    mychart.setOption(option, true)

}

//每个图形独立出来数据

//非时间序列的柱状图数据
function gene_bar_series(data, legend, y_axis_format, type='bar', boundaryGap=true) {
    //console.log(y_axis_format)
    var serie = [];
    var areaStyle
    var stack
    if (type=='line' && !boundaryGap) {
        areaStyle={normal:{}}
        stack = '总量'
    } else {
        areaStyle={}
        stack = undefined
    }
    data.forEach(function(val,index,arr){
        var item = {
            name:legend[index],
            type: type,
            barMaxWidth: 60,
            barGap: "10%",
            areaStyle:areaStyle,
            stack:stack,
            data: val,
        }

        //叠加状态 最后一个显示总数
        if (index == data.length -1 && stack !== undefined) {
            item.label = {
                normal: {
                    show: true,
                    position: 'top'
                }
            }
        }

        serie.push(item);
    })
    return serie
}


//饼图
function pie_viz(data,fd) {
    // 数据适配echart格式
    var option = {}
    var values = []
    var legend = []
    data.forEach(function(val,index, arr){
       values.push({
            'value':val.y,
            'name': val.x
       })
       legend.push(val.x)        
    })
    option = {
        legend:{
            //orient: 'vertical',
            left: '15%',
            top: 24,
            data: legend,

        },
        tooltip : {
            trigger: 'item',
            formatter: "{b} : {c} ({d}%)"
        },
        series: {
            type: 'pie',
            radius : '55%',
            center: ['50%', '60%'],
            data: values,
            itemStyle: {
                emphasis: {
                    borderWidth: 2,
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }
    }

    if (!fd.show_legend) {
       option.legend['show'] = false
       option.series['labelLine'] = {'normal':{'show': false}}
       option.series['label'] = {'normal':{'show': false}}
    }

    return option
}    


//柱状图
function dist_bar_viz(data, fd) {
    var option = {}
    var values = []
    var legend = []
    var xAxis_values = []
    var table_id = fd.datasource
    data.forEach(function(val,index, arr){
        var tmp_values = []
        val.values.forEach(function(v,i, arr){
           tmp_values.push(v.y)
           if (index==0){
               xAxis_values.push(v.x)
           }
        })
        values.push(tmp_values)
        legend.push(verbose_map[table_id][val.key] || val.key)     
    })

    option = {
        legend:{
            //orient: 'horizontal',
            //type: 'scroll',
            left: '15%',
            top: 24,
            data: legend,
        },
        tooltip : {
            left:'95%',
            trigger: 'axis',
            axisPointer : {            // 坐标轴指示器，坐标轴触发有效
                type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
            },
            // formatter:function(data,value, dataIndex){
            //   console.log(data)
            //   return axisLabel_formatter(value, dataIndex, fd.y_axis_format) 
            // }, 
        },
        xAxis : [
            {
                type : 'category',
                data : xAxis_values
            }
        ],
        yAxis : [
            {
                type : 'value',
                axisLabel: {
                  formatter: function(value, index){
                    return axisLabel_formatter(value, index, fd.y_axis_format) 
                  }
                }
            }
        ],
        series : gene_bar_series(values, legend, fd.y_axis_format)
    }

    if (!fd.show_legend) {
       option.legend['show'] = false
    }

    return option
}


//时间-折线
//柱状图
function time_line_viz(data, fd, boundaryGap=true) {
    var option = {}
    var values = []
    var legend = []
    var xAxis_values = []
    var table_id = fd.datasource
    data.forEach(function(val,index, arr){
        var tmp_values = []
        val.values.forEach(function(v,i, arr){
           tmp_values.push(v.y)
           if (index==0){
               xAxis_values.push(numberToDatetime(v.x))
           }
        })
        values.push(tmp_values)
        // key可能是list 或 string
        if(typeof val.key === 'string') {
          legend.push(verbose_map[table_id][val.key] || val.key)  
        } else {
          var tmp_key = ''
          val.key.forEach(function(val, index, arr){
            tmp_key += verbose_map[table_id][val] || val
            tmp_key += ','
          })
          legend.push(tmp_key.substring(0,tmp_key.length-1))
        }
             
    })
    option = {
        legend:{
            //orient: 'horizontal',
            //type: 'scroll',
            left: '15%',
            top: 24,
            data: legend,
        },
        grid: {
            height: '70%',
            y: '20%'
        },
        tooltip : {
            left:'95%',
            trigger: 'axis',
            axisPointer : {            // 坐标轴指示器，坐标轴触发有效
                type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
            }
        },
        xAxis : [
            {
                type : 'category',
                boundaryGap: boundaryGap,
                data : xAxis_values
            }
        ],
        yAxis : [
            {   
                type : 'value',
                //min: 'dataMin',
                name: fd.y_axis_label,
                axisLabel: {
                  formatter: function(value, index){
                    return axisLabel_formatter(value, index, fd.y_axis_format) 
                  }
                }
            }
        ],
        series : gene_bar_series(values, legend, fd.y_axis_format, type='line', boundaryGap=boundaryGap)
    }

    //console.log('max_min:',  fd.y_axis_bounds)

    if (fd.y_axis_bounds[0] !== undefined) {
      option.yAxis[0]['min'] = fd.y_axis_bounds[0]
    }
    if (fd.y_axis_bounds[1] !== undefined) {
      option.yAxis[0]['max'] = fd.y_axis_bounds[1]
    }
    if (!fd.show_legend) {
       option.legend['show'] = false
    }

    return option
}


//折线图（大数字）
function big_number_viz(data, fd){
    var option = {}
    var values = []
    var xAxis_values = []
    data.data.forEach(function(val,index, arr){
       values.push(val[1])
       xAxis_values.push(numberToDatetime(val[0]))
    })

    var compare_value

    if (values[values.length-1] == 0 || values[values.length-1-data.compare_lag] == undefined){
        compare_value = 0
    } else {
        compare_value = (values[values.length-1] - values[values.length-1-data.compare_lag]) /values[values.length-1] * 100
    }

    var sub_text_color

    if (compare_value < 0) {
      sub_text_color = 'yellow'   
    } else {
      sub_text_color = 'green'  
    }
    option = {
        title: [
           {
                z:5,
                text: axisLabel_formatter(values[values.length-1], 0, fd.y_axis_format),
                subtext: compare_value.toFixed(2) + '%'+ data.compare_suffix,
                left:'center',
                top:'50%',
                textStyle:{
                    fontSize:40,
                    align:'center',
          
                },
                subtextStyle:{
                    fontSize:20,
                    align:'center',
                    color:sub_text_color,
                }
                
        }],
        tooltip : {
            left:'95%',
            trigger: 'axis',
            axisPointer : {            // 坐标轴指示器，坐标轴触发有效
                type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
            }
        },
        xAxis : [
            {
                type : 'category',
                data : xAxis_values,
                show : false,
            }
        ],
        yAxis : [
            {
                type : 'value',
                show : false,
            }
        ],
        series : {
            type:'line',
            data: values
        }
    }

    return option
}

//大数字
function big_number_total(data, data_form){

    option = {
        title: [
           {
                z:5,
                text: axisLabel_formatter(data.data[0], 0, data_form),
                subtext: data.subheader,
                left:'center',
                top:'35%',
                textStyle:{
                    fontSize:45,
                    align:'center',
                },
                subtextStyle:{
                    fontSize:20,
                    align:'center',
                    color:'yellow',
                }
                
        }],

    }

    return option
}

//地图
function world_map(data) {
    //TODO：还有气泡没有做
    var option = {}
    var values = []
    var max_value = data[0].m1
    data.forEach(function(val,index, arr){
       values.push({
            //TODO: 包含多个数据
            'value':val.m1,
            'name': val.name
       })
       if (max_value < val.m1) {
           max_value = val.m1
       }
    })

    option = {
        tooltip : {
            trigger: 'item',
            //TODO：显示数据
        },

        visualMap: {
            min: 0,
            max: max_value,
            left: 'left',
            top: 'bottom',
            text: ['高','低'],           // 文本，默认为数值文本
            calculable: true,
            textStyle:{
                color: '#FFF',
            }
        },

        series: [
            {
                type: 'map',
                //zoom: 2,
                itemStyle:{  
                  emphasis:{label:{show:true}}  
                }, 
                roam: true,   //可以放缩
                mapType: 'world',
                data: values
            }]
        
    }
    return option
}


//中国地图
function china_map(data) {

    var option = {}
    var values = []
    var max_value = data[0].metric
    data.forEach(function(val,index, arr){
       values.push({
            'value':val.metric,
            'name': val.country_id
       })
       if (max_value < val.metric) {
           max_value = val.metric
       }
    })

    option = {
        tooltip : {
            trigger: 'item',
        },

        visualMap: {
            //min: 'dataMin',
            max: max_value,
            left: 'left',
            top: 'bottom',
            text: ['高','低'],           // 文本，默认为数值文本
            calculable: true,
            textStyle:{
                color: '#FFF',
            }
        },

        series: [
            {
                type: 'map',
                zoom: 1,
                label: {
                    emphasis: {
                        show: false
                    }
                },
                roam: true,   //可以放缩
                mapType: 'china',
                data: values
            }]
        
    }
    return option
}


//地区地图
function china_city(data, fd) {

    var option = {}
    var values = []
    var bol_size = Number(fd.max_bubble_size)
    var reduce_size = Number(fd.reduce_size)
    //TODO：数字显示整理
    var max_value = data[0].metric
    data.forEach(function(val,index, arr){
       var geoCoord = geoCoordMap[val.country_id];
       if (geoCoord) {
           values.push({
                'value':geoCoord.concat(val.metric),
                'name': val.country_id
           })
           if (max_value < val.metric) {
               max_value = val.metric
           }
       }
    })

    option = {

        geo: {
            map: 'china',
            label: {
                emphasis: {
                    show: false
                }
            },
            roam: true,
            itemStyle: {
                normal: {
                    areaColor: '#323c48',
                    borderColor: '#111'
                },
                emphasis: {
                    areaColor: '#2a333d'
                }
            }
        },
        tooltip : {
            trigger: 'item'
        },
        visualMap: {
            //min: 0,   //暂时没有负数
            max: max_value,
            left: 'left',
            top: 'bottom',
            text: ['高','低'],           // 文本，默认为数值文本
            calculable: true,
            textStyle:{
                color: '#FFF',
            }
        },
        series : [
            {
                type: 'scatter',
                coordinateSystem: 'geo',
                data: values,
                symbolSize: function (val) {
                    //TODO：点大小的动态调整
                    return Math.max(val[2] * bol_size / reduce_size, 8);
                },
                label: {
                    normal: {
                        formatter: '{b}',
                        position: 'right',
                        show: false
                    },
                    emphasis: {
                        formatter: '{b}',
                        show: false
                    }
                },
                itemStyle: {
                    //show:false,
                    normal: {
                        color: '#ddb926'
                    }
                }
            },

        ]
    }
    return option
}


//词云
function word_cloud(data) {
    // 数据适配echart格式
    var option = {}
    var values = []
    //var legend = []
    data.forEach(function(val,index, arr){
       values.push({
            'value':val.size,
            'name': val.text
       })
       //legend.push(val.text)        
    })
    option = {
        tooltip : {},
        legend: {show: false},
        series: {
            type: 'wordCloud',
            gridSize: 15,
            sizeRange: [12, 60],
            rotationRange: [-45, 45],
            shape: 'circle',
            data: values,
            textStyle: {
                // TODO: 挑选适合dark主题的色系
                // normal: {
                //     color: function() {
                //         return 'rgb(' + [
                //             Math.round(Math.random() * 160),
                //             Math.round(Math.random() * 160),
                //             Math.round(Math.random() * 160)
                //         ].join(',') + ')';
                //     }
                // },
                emphasis: {
                    shadowBlur: 10,
                    shadowColor: '#333'
                }
            },
        }
    }
    return option
}


//求队列里面的和
function calcule_treemap_total(parent, child_data) {
    if (child_data[0].children !== undefined) {
        for (var i=0; i<child_data.length; i++){
            child_data[i] = calcule_treemap_total(child_data[i], child_data[i].children)
        }
    } 
    
    var sum = 0  
    child_data.forEach(function(val, index, arr){
        sum += val.value
        val.name = parent.name + '.' + val.name 
    })
    parent.value = sum
    return parent

}


//树状图
function treemap(data, table_id) {

    series_name = data[0]['name']
    data[0]['name'] = verbose_map[table_id][series_name] || series_name
    data[0] = calcule_treemap_total(data[0], data[0].children)
    
    //console.log('trese', data[0])

    option = {
        tooltip : {},
        legend: {show: false},
        
        series: {
            name: verbose_map[table_id][series_name] || series_name,
            type: 'treemap',
            visibleMin: 100,
            data: data[0].children,
            leafDepth: 2,
            levels: [
                {
                    itemStyle: {
                        normal: {
                            borderColor: '#555',
                            borderWidth: 4,
                            gapWidth: 4
                        }
                    }
                },
                {
                    colorSaturation: [0.3, 0.6],
                    itemStyle: {
                        normal: {
                            borderColorSaturation: 0.7,
                            gapWidth: 3,
                            borderWidth: 3
                        }
                    }
                },
                {
                    colorSaturation: [0.3, 0.5],
                    itemStyle: {
                        normal: {
                            borderColorSaturation: 0.6,
                            gapWidth: 1
                        }
                    }
                },
                {
                    colorSaturation: [0.3, 0.5]
                }
            ]
        },
        
    }
    return option
}


//箱线图
function box_plot(data, fd) {
    
    function formatter(param) {
        return [
            '项目 ' + param.name + ': ',
            '最大值: ' + param.data[0],
            'Q1: ' + param.data[1],
            '中位数: ' + param.data[2],
            'Q3: ' + param.data[3],
            '最小值: ' + param.data[4]
            ].join('<br/>')
        }

    var option = {}
    var xAxis_values = []
    var values = []
    var outliers = []
    data.forEach(function(val,index, arr){
        xAxis_values.push(val.label)
        values.push([val.values.whisker_low, val.values.Q1, val.values.Q2, val.values.Q3, val.values.whisker_high])
        for (var i=0; i<val.values.outliers.length; i++){
            outliers.push([index, val.values.outliers[i]])
        }
    })

    option = {
        tooltip : {
          trigger: 'item',
          axisPointer : {            // 坐标轴指示器，坐标轴触发有效
              type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
          }
        },
        xAxis : {
          type : 'category',
          data : xAxis_values,
          splitArea: {show: false},
          axisLabel: {formatter: '{value}'},
          splitLine: {show: false}
        },
        yAxis : {
          type : 'value',
          name : '-',
          splitArea: {
              show: false
          },
          axisLabel: {
            formatter: function(value, index){
              return axisLabel_formatter(value, index, fd.y_axis_format) 
            }
          }
        },
        series : [{
            name: '-',
            type: 'boxplot',
            data: values,
            tooltip: {formatter: formatter}
        },{
            name: '异常点',
            type: 'pictorialBar',
            symbolPosition: 'end',
            symbolSize: 8,
            barGap: '10%',
            data: outliers
        }]
    }
    //console.log('box:', option)
    if (!fd.show_legend) {
       option.legend['show'] = false
    }
    return option

}

//时间热力图
function cal_heatmap(data) {

    var option
    var date_value = []
    var max_value = 0
    var start_year = numberToDatetime(data.start).split('-')[0]

    for (val in data.timestamps) {
        if (data.timestamps[val] > max_value) {
            max_value = data.timestamps[val]
        }
        date_value.push([numberToDatetime(val, type='date'), data.timestamps[val]])
    }
    option = {
        tooltip : {position: 'top'},

        visualMap: {
            min: 0,
            max: max_value,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            top: 'top',
            textStyle:{
                color: '#FFF',
            }
        },
        calendar: {
            range: start_year, //['2011-01-01', '2011-12-31'],//'2011',
            cellSize: ['15',15],
            left: 70,
            right: 30,
            dayLabel:{
                nameMap:'cn',
                color: '#FFF'
            },
            monthLabel:{
                nameMap: 'cn',
                color: '#FFF'
            },
            yearLabel: {
                show: true,
                // formatter:index[i].name,
            },
        },
        series : {
            type: 'heatmap',
            coordinateSystem: 'calendar',
            data: date_value,
            tooltip: {
                // TODO：显示调整
                formatter:function(data){
                    return data.value[0]+'<br/>'+data.value[1]
                },
            },
        },

    }
    return option
}


//散点气泡图
function bubble(data, fd) {
    var entity = fd.entity

    var schema = [
        {name: 'x', index: 0, text: verbose_map[fd.datasource][fd.x] || fd.x},
        {name: 'y', index: 1, text: verbose_map[fd.datasource][fd.y] || fd.y},
        {name: 'size', index: 2, text: verbose_map[fd.datasource][fd.size] || fd.size},
        {name: 'name', index:3, text: verbose_map[fd.datasource][entity] || entity}
    ];

    var option
    var series = []
    var legend = []

    var bol_size = Number(fd.max_bubble_size)
    var reduce_size = fd.reduce_size

    data.forEach(function(val, index, arr){
        legend.push(val.key)
        
        var tmp_values = []
        val.values.forEach(function(val, index, arr){
            tmp_values.push([val.x, val.y, val.size, val[entity]])
        })
        
        series.push({
            name: val.key,
            type: 'scatter',
            data: tmp_values,
            symbolSize: function(data) {
                return Math.max(Math.sqrt(data[2]) * bol_size / reduce_size, 5)
            },
            // TODO: 加参数是否显示标记
            // markPoint : {
            //     data : [
            //         {type : 'max', name: '最大值'},
            //         {type : 'min', name: '最小值'}
            //     ]
            // },
            // markLine : {
            //     lineStyle: {
            //         normal: {
            //             type: 'solid'
            //         }
            //     },
            //     data : [
            //         {type : 'average', name: '平均值'},
            //     ]
            // },
        })

    })
        
    option = {
        legend:{
          data: legend,
          top: '15',
          left: '12%',
        },
        tooltip: {
            trigger: 'item',
            padding: 10,
            backgroundColor: '#222',
            borderColor: '#777',
            borderWidth: 1,
            formatter: function (obj) {
              var value
              var series_name
              if(obj.value == undefined) {
                value = obj[0].value
                series_name = obj[0].seriesName
              } else {
                value = obj.value
                series_name = obj.seriesName
              }
                
              return '<div style="border-bottom: 1px solid rgba(255,255,255,.3); font-size: 18px;padding-bottom: 7px;margin-bottom: 7px">'
                  + value[3] + ' (' + series_name + ')'
                  + '</div>'
                  + schema[0].text + '：' + value[0] + '<br>'
                  + schema[1].text + '：' + value[1] + '<br>'
                  + schema[2].text + '：' + value[2] + '<br>';
          }
        },

        xAxis: {
          type: 'value',
          name: schema[0].text
        },
        yAxis: {
          type: 'value',
          name: schema[1].text,
          axisLabel: {
            formatter: function(value, index){
              return axisLabel_formatter(value, index, fd.y_axis_format) 
            }
          }
        },
        series : series,
    }

    if (!fd.show_legend) {
       option.legend['show'] = false
    }
    return option
}

//分类-散点图,前端的实时计算,没有保存到数据库
function clustering(data, fd) {
  
  var entity = fd.entity
  var schema = [
      {name: 'x', index: 0, text: verbose_map[fd.datasource][fd.x] || fd.x},
      {name: 'y', index: 1, text: verbose_map[fd.datasource][fd.y] || fd.y},
      {name: 'size', index: 2, text: verbose_map[fd.datasource][fd.size] || fd.size},
      {name: 'name', index:3, text: verbose_map[fd.datasource][entity] || entity}
  ]

  var values = []
  var origin_values = {}

  var bol_size = Number(fd.max_bubble_size)
  var reduce_size = Number(fd.reduce_size)
  
  data.forEach(function(val, index, arr){
      val.values.forEach(function(val, index, arr){
            //分类参数可以多个 data = [[1,2,3,4], [,.1,2.1,3.1,4.1]], 要归一化才能把所有放在一起比较
            values.push([val.x, val.y])
            origin_values[String(val.x)+'|'+String(val.y)] = [val.size, val[entity]]
        })
  })
  // 分类
  var result = ecStat.clustering.hierarchicalKMeans(values, Number(fd.stat_number), false)

  var centroids = result.centroids
  var ptsInCluster = result.pointsInCluster
  var series = []
  var legend = []
  

  for (var i = 0; i < centroids.length; i++) {
      
      //补充更多信息
      var tmp_data = []
      ptsInCluster[i].forEach(function(val, index, arr){
        tmp_data.push([...val, ...origin_values[String(val[0])+'|'+String(val[1])]])
      })
      
      legend.push('类别：' + i)

      series.push({
          name: '类别：' + i,
          type: 'scatter',
          data: tmp_data,
          symbolSize: function(data) {
                return Math.max(Math.sqrt(data[2]) * bol_size / reduce_size, 10)
            },
          markPoint: {
              symbolSize: 50,
              label: {
                  normal: {
                      show: false,
                      fontSize: 18
                  },
                  emphasis: {
                      show: true,
                      position: 'top',
                      formatter: function (params) {

                          return Math.round(params.data.coord[0] * 100) / 100 + '  '
                              + Math.round(params.data.coord[1] * 100) / 100 + ' ';
                      },
                      textStyle: {
                          color: '#FFF'
                      }
                  }
              },
              
              itemStyle: {
                  normal: {
                      opacity: 0.8
                  }
              },
              data: [{
                  coord: centroids[i]
              }]
          }
      });
  }

  var option = {
        legend: {
          data: legend,
          top: '15',
          left: '12%',
        },
        tooltip: {
            trigger: 'axis',
            padding: 10,
            backgroundColor: '#222',
            borderColor: '#777',
            borderWidth: 1,
            formatter: function (obj) {
                var value = obj[0].data
                return '<div style="border-bottom: 1px solid rgba(255,255,255,.3); font-size: 18px;padding-bottom: 7px;margin-bottom: 7px">'
                    + value[3] + ' (' + obj[0].seriesName + ')'
                    + '</div>'
                    + schema[0].text + '：' + value[0] + '<br>'
                    + schema[1].text + '：' + value[1] + '<br>'
                    + schema[2].text + '：' + value[2] + '<br>';
            }
        },
        xAxis: {
            type: 'value',
            name: schema[0].text,
        },
        yAxis: {
            type: 'value',
            name: schema[1].text,
            axisLabel: {
              formatter: function(value, index){
                return axisLabel_formatter(value, index, fd.y_axis_format) 
              }
            }
        },
        series: series
    }
 return option
}

//回归分析散点图,前端的实时计算,没有保存到数据库
function regression(data, fd) {
  
  var entity = fd.entity
  var schema = [
      {name: 'x', index: 0, text: verbose_map[fd.datasource][fd.x] || fd.x},
      {name: 'y', index: 1, text: verbose_map[fd.datasource][fd.y] || fd.y},
      {name: 'size', index: 2, text: verbose_map[fd.datasource][fd.size] || fd.size},
      {name: 'name', index:3, text: verbose_map[fd.datasource][entity] || entity}
  ]

  var values = []
  var origin_values = []
  data.forEach(function(val, index, arr){
      val.values.forEach(function(val, index, arr){
            values.push([val.x, val.y])
            origin_values.push([val.x, val.y, val.size, val[entity]])
        })
  })


  // 回归分析
  if(fd.stat_function !== 'polynomial') {
    var myRegression = ecStat.regression(fd.stat_function, values)
  } else {
    //多项式多number参数
    //console.log(fd.other.type)
    var myRegression = ecStat.regression(fd.stat_function, values, Number(fd.stat_number))
  }
  

  var option = {
        tooltip: {
            trigger: 'axis',
            padding: 10,
            backgroundColor: '#222',
            borderColor: '#777',
            borderWidth: 1,
            formatter: function (obj) {
                var value = obj[0].data
                return '<div style="border-bottom: 1px solid rgba(255,255,255,.3); font-size: 18px;padding-bottom: 7px;margin-bottom: 7px">'
                    + value[3] + ' (' + obj[0].seriesName + ')'
                    + '</div>'
                    + schema[0].text + '：' + value[0] + '<br>'
                    + schema[1].text + '：' + value[1] + '<br>'
                    + schema[2].text + '：' + value[2] + '<br>';
            }
        },
        xAxis: {
            type: 'value',
            name: schema[0].text,
        },
        yAxis: {
            type: 'value',
            name: schema[1].text,
            axisLabel: {
              formatter: function(value, index){
                return axisLabel_formatter(value, index, fd.y_axis_format) 
              }
            }
        },
        series: [{
            name: 'scatter',
            type: 'scatter',
            data: origin_values
        }, {
            name: 'line',
            type: 'line',
            showSymbol: false,
            data: myRegression.points,
            markPoint: {
                itemStyle: {
                    normal: {
                        color: 'transparent'
                    }
                },
                label: {
                    normal: {
                        show: true,
                        top: '30%',
                        left: '60%',
                        formatter: myRegression.expression,
                        textStyle: {
                            color: '#FFF',
                            fontSize: 20
                        }
                    }
                },
                data: [{
                    coord: myRegression.points[myRegression.points.length - 1]
                }]
            }
        }]
    }
 return option
}

//直方图
function histogram(data) {
    var option
    var bins = ecStat.histogram(data)

    option = {
        tooltip : {
            trigger: 'axis'
        },
        xAxis: [{
            type: 'value',
            scale: true, //这个一定要设，不然barWidth和bins对应不上
        }],
        yAxis: [{
            scale: true,
            type: 'value',
        }],
        series: [{
            //name: 'height',
            type: 'bar',
            //barWidth: '99.3%',
            label: {
                normal: {
                    show: true,
                    position: 'insideTop',
                    formatter: function(params) {
                        return params.value[1];
                    }
                }
            },
            data: bins.data
        }]
    }
    return option
}


//多层拼图
function sunburst(data, fd) {
   var option
   
   var values = []
   
   var num_circle = fd.groupby.length

   //TODO: metric and second_metric 不一样的时候，要另外处理

   if ((fd.metric !== fd.secondary_metric) && (fd.secondary_metric !== undefined)){
        num_circle -= 2    
   }
   for(var i=0; i<num_circle; i++) {
        values.push({})
    }

   data.forEach(function(val,index, arr){

      for(var i=0; i<num_circle; i++) {
        if(i == 0) {
            if (values[i][val[i]] == undefined) {
                values[i][val[i]] = val[num_circle]
            } else {
                values[i][val[i]] += val[num_circle]
            }
        } else {
            //多层命名
            var key = val.slice(0, i+1).join('_')

            if (values[i][key] == undefined) {
                values[i][key] = val[num_circle]
            } else {
                values[i][key] += val[num_circle]
            }
        }
      }

   })
   
   //console.log(values[1])
   //console.log(values[1].sort())

   //转换为符合echart格式
   
   //最里面一层
   var tmp_values = []
   for(var key in values[0]){
        tmp_values.push({
            'name': key,
            'value': values[0][key]
        })
     }

    var pie_values = [tmp_values]
    
    for(var key=1; key<values.length; key++){
        //debugger
        //找下一层的数据
        var sub_tmp_values = []
        for(var i=0; i<tmp_values.length; i++){
            for(var sub_key in values[key]){
                //按照上一层数据顺序
                //多层比较
                if(sub_key.split('_', key).join('_') == tmp_values[i].name){
                    sub_tmp_values.push({
                        'name': sub_key,
                        'value': values[key][sub_key]
                    })
                }    
            }
            
        }

        pie_values.push(sub_tmp_values)

        tmp_values = sub_tmp_values
         
    }
   


   //创建series
   var series = []
   for(var i=0; i<num_circle; i++) {

        var radius_min = Math.floor(i * 80 / num_circle)
        var radius_max = radius_min + Math.floor(80 / num_circle)
        series.push({
            type: 'pie',
            selectedMode: 'single',
            radius : [radius_min + '%', radius_max + '%'],
            center: ['50%', '50%'],
            data: pie_values[i],
            label: {
                normal:{show: false}
            },

        })
    }

   option = {
       tooltip: {
           trigger: 'item',
           formatter: "{b}<br>数量：{c} ({d}%)"
       },
       series: series
   }
   //console.log(option)
   return option 
}


//桑基图
function sankey(data) {
    var option

    var data_name = []

    var node = []

    data.forEach(function(val, index, arr){
        if (data_name.indexOf(val.target) == -1) {
            node.push({'name': val.target})
            data_name.push(val.target)
        }

        if (data_name.indexOf(val.source) == -1) {
            data_name.push(val.source)
            node.push({'name': val.source})
        }
    })

    option = {
        tooltip: {
            trigger: 'item',
            triggerOn: 'mousemove'
        },
        series: [
            {
                type: 'sankey',
                layout: 'none',
                label: {
                    normal:{
                        color: '#FFF'
                    }
                },
                data: node,
                links: data,
                itemStyle: {
                    normal: {
                        borderWidth: 1,
                        borderColor: '#aaa'
                    }
                },
                lineStyle: {
                    normal: {
                        color: 'source',
                        curveness: 0.5
                    }
                }
            }
        ]
    }
    return option
}


//有向图
function directed_force(data) {
    var option

        var data_name = []

        var node = []

        data.forEach(function(val, index, arr){
            if (data_name.indexOf(val.target) == -1) {
                node.push({
                    'name': val.target,
                    'draggable': true,
                    "symbolSize": val.value * 10,    //TODO：这个大小要和尺寸成正比
                })
                data_name.push(val.target)
            }

            if (data_name.indexOf(val.source) == -1) {
                data_name.push(val.source)
                node.push({
                    'name': val.source,
                    'draggable': true,
                    "symbolSize": val.value * 10,
                })
            }
        })

        option = {
            series: [
                {
                    type: 'graph',
                    layout: 'force',
                    force: {
                        repulsion: 400   // 连线长度
                    },
                    focusNodeAdjacency: true,
                    label: {
                        normal:{
                            show:true,
                            color: '#FFF'
                        }

                    },
                    data: node,
                    links: data,
                    itemStyle: {
                        normal: {
                            borderWidth: 1,
                            borderColor: '#aaa'
                        }
                    },
                    lineStyle: {
                        normal: {
                            color: 'source',
                            curveness: 0.3,
                            type: "solid"
                        }
                    }
                }
            ]
        }
        //console.log('graph', option)
        return option
}

//和弦图
function chord(data) {
    // 数量没有表示出来
    var option

    var links = []

    var nodes = []
    //数据处理
    data.matrix.forEach(function(val, index, arr){
        for(var i=0; i<val.length; i++) {
            if(val[i] > 0){
                links.push({
                    source: data.nodes[index],
                    target: data.nodes[i],
                    //symbolSize: val[i],
                })
            }
        }
    })

    data.nodes.forEach(function(val, index, arr){
        nodes.push({
            name: val
        })
    })

    option = {
        series: [
            {
                type: 'graph',
                layout: 'circular',
                force: {
                    initLayout: 'circular',
                    repulsion: 50,
                    gravity: 0.5,
                    edgeLength: 500,
                    layoutAnimation: true,
                },

                roam: false,
                focusNodeAdjacency: true,
                //ribbonType: true,
                label: {
                    normal:{
                        show:true,
                        color: '#FFF'
                    }
                },

                data: nodes,
                links: links,
                itemStyle: {
                    normal: {
                        label: {
                            rotate: true,
                            show: true,


                        },
                    },
                    emphasis: {
                        label: {
                            show: true
                        }
                    }
                },
                lineStyle: {
                    normal: {
                        color: 'source',
                        curveness: 0.3,
                        type: "solid"
                    }
                }
            }
        ]
    }
    return option
}

//平行坐标
function parallel(data, fd) {
    var option

    var parallelAxis = []

    var begin_number = 0
    // 包含项目轴
    if (fd.include_series) {
      begin_number = 1
      parallelAxis.push({
            dim: 0,
            name: verbose_map[fd.datasource][fd.series]  || fd.series,
            type: 'category',
        })
    }

    fd.metrics.forEach(function(val,index, arr){
        parallelAxis.push({
            dim: index + begin_number,
            max: 'dataMax',
            min: 'dataMin',
            name: verbose_map[fd.datasource][val]  || val
        })
    })

    var series = []

    var legend = []

    data.forEach(function(val,index, arr){
        var items = []
        
        // 包含项目轴
        if (fd.include_series) {
          items.push(val[fd.series])
        }

        for(var i=0; i< fd.metrics.length; i++){
            items.push(val[fd.metrics[i]])
        }
        
        series.push({
            name: val[fd.series],
            type:'parallel',
            data: [items],
            lineStyle: {
                normal: {
                    width: 1,
                    opacity: 0.5
                }
            }
        })

        legend.push(val[fd.series])
    })

    // 包含项目轴
    if (fd.include_series) {
      parallelAxis[0]['data'] = legend
    }
    
    option = {
        parallelAxis: parallelAxis,
        parallel: {                         // 这是『坐标系』的定义
            left: '5%',                     // 平行坐标系的位置设置
            right: '13%',
            bottom: '10%',
            top: '20%',
            parallelAxisDefault: {          // 『坐标轴』的公有属性可以配置在这里避免重复书写
                type: 'value',
                nameLocation: 'end',
                nameGap: 20
            }
        },
        legend:{
            top: '15',
            left: '12%',
            data: legend,
        },
        series: series,
    }

    if (!fd.show_legend) {
       option.legend['show'] = false
    }
    return option
}

//热力图
function heatmap(data, fd) {
    var x_name = verbose_map[fd.datasource][fd.all_columns_x]  || fd.all_columns_x
    var y_name = verbose_map[fd.datasource][fd.all_columns_y]  || fd.all_columns_y
    var metric = verbose_map[fd.datasource][fd.metric] || fd.metric
    function formatter(param) {
        return [
            x_name + ':' + param.data[0],
            y_name + ':' + param.data[1],
            metric + ':' + param.data[3],
            '占比：' + param.data[2],
        ].join('<br/>')
    }

    var option 

    var values = []
    var xAxis_data = []
    var yAxis_data = []
    var all_is_number = true
    data.records.forEach(function(val, index, arr){
        if (xAxis_data.indexOf(val.x) == -1){
            xAxis_data.push(val.x.toString())
        }

        if (yAxis_data.indexOf(val.y) == -1){
              // echart bug 如果是数字不管怎样都会变成number
              if (isNaN(Number(val.y))) {
                  all_is_number =false
              }
              yAxis_data.push(val.y)  
        }

        values.push([val.x, val.y, val.perc.toFixed(2), val.v])
    })

    if (all_is_number) {
       yAxis_data = yAxis_data.sort(sortNumber)
       yAxis_data.forEach(function(val, index, arr){
           // echart bug 如果是数字不管怎样都会变成number, 所以加如一点东西，让他强制是string
           yAxis_data[index] = val.toString() + '_'
       })
       values.forEach(function(val, index, arr){
          val[1] = val[1].toString() + '_'
       })
    }


    option = {
        tooltip: {
            trigger: 'item',
        },
        xAxis: {
            type: 'category',
            data: xAxis_data,
            // splitArea: {
            //     show: true
            // }
        },
        grid: {
            height: '70%',
            y: '20%'
        },
        yAxis: {
            type: 'category',
            data: yAxis_data,
            // splitArea: {
            //     show: false
            // }
        },
        visualMap: {
            min: data.extents[0],
            max: data.extents[1],
            textStyle:{
                color: '#FFF',
            },
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            top: '15'
        },
        series: [{
            type: 'heatmap',
            data: values,
            // label: {
            //     normal: { // 图上展示
            //         show: true
            //     }
            // },
            tooltip: {formatter: formatter}, //鼠标移动到这里动态显示
            itemStyle: {
                emphasis: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }]
    }
    return option
}


//透视图
function pivot_table(data, fd) {
  var indicator = []
  var series_data = []
  var columns_data = []
  var legend = []

  //只有一个值的时候，不一样的。
  if(data.columns.length == 1 ) {
    verbose_map[fd.datasource][fd.all_columns_x]  || fd.all_columns_x
    
    legend.push(verbose_map[fd.datasource][fd.groupby[0]] || fd.groupby[0])
    
    columns_data.push({
      name: legend[0],
      value: [],
    })

    data.values.data.forEach(function(val, index, arr){
      columns_data[0].value.push(val[0])
    })

  } else {

    data.columns.forEach(function(val, index, arr){
      var key = val.slice(1).join('.')
      columns_data.push({
        name: key,
        value: []
      })
      legend.push(key)
    })
    
    data.values.data.forEach(function(val, index, arr){
      val.forEach(function(v, index, arr){
         columns_data[index].value.push(v)
      })
    })
  }

  data.values.index.forEach(function(val, index, arr){
    //以后可以改变max
    indicator.push({'name':val, 'max': fd.radar_max_value})
  })
  
  

  var option = {
      tooltip: {},
      legend: {
          top: '22',
          left: '12%',
          data: legend,
      },
      radar: {
          // shape: 'circle',  图像弧度
          radius: '65%',
          center: ['50%', '55%'],
          name: {
              textStyle: {
                  color: '#fff',
                  backgroundColor: '#999',
                  borderRadius: 3,
                  padding: [3, 5]
             }
          },
          indicator: indicator
      },
      series: [{
          //name: '预算 vs 开销（Budget vs spending）',
          type: 'radar',
          areaStyle: {normal: {}}, //填充图形颜色
          data : columns_data,
      }]
  };

  //console.log(option)
  return option
}


//双坐标
function dual_line(data, fd) {
    var option = {}
    var series = []
    var table_id = fd.datasource

    var tmp_values = []
    var legend = []
    var xAxis_values = []

    //双坐标只有两组数据
    data[0].values.forEach(function(v,i, arr){
        tmp_values.push(v.y)
        if (fd.granularity_sqla == undefined) {
          xAxis_values.push(v.x)
        } else {
          xAxis_values.push(numberToDatetime(v.x))
        }
        
    })

    legend.push(verbose_map[table_id][data[0].key] || data[0].key)

    series.push({
      name:[verbose_map[table_id][data[0].key] || data[0].key],
      type: 'bar',
      barMaxWidth: 60,
      barGap: "10%",
      yAxisIndex: 0,
      data: tmp_values,
    })

    tmp_values = []

    data[1].values.forEach(function(v,i, arr){
        tmp_values.push(v.y)
    })

    legend.push(verbose_map[table_id][data[1].key] || data[1].key)

    series.push({
      name:[verbose_map[table_id][data[1].key] || data[1].key],
      type: 'line',
      yAxisIndex: 1,
      data: tmp_values,
    })

    option = {
        legend:{
            left: '15%',
            top: 24,
            data: legend,
        },
        tooltip : {
            left:'95%',
            trigger: 'axis',
            axisPointer : {            // 坐标轴指示器，坐标轴触发有效
                type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
            },
        },
        xAxis : [
            {
                type : 'category',
                data : xAxis_values
            }
        ],
        yAxis : [
            {
                type : 'value',
                position: 'left',
                axisLabel: {
                  formatter: function(value, index){
                    return axisLabel_formatter(value, index, fd.y_axis_format) 
                  }
                }
            },
            {
                type : 'value',
                position: 'right',
                axisLabel: {
                  formatter: function(value, index){
                    return axisLabel_formatter(value, index, fd.y_axis_format) 
                  }
                }
            }
        ],
        series : series
    }

    return option
}

//返回某一年的总天数  
function GetYearDays(wYear) {
  
  if((wYear%400 == 0) || ((wYear%4==0) && (wYear%100))) {
    return 366
  }
  
  return 366   
}  
//数字转日期
function numberToDatetime(date, type='datetime'){
    var tmp_datetime = new Date()
    var date_num = Number(date)
  
    if (type=='date') {
        //,
        //console.log('time', start)
        date_num = date_num * 1000
        //console.log('time-change', date_num)
        tmp_datetime.setTime(date_num)
    } else {
        //tmp_datetime.setTime(date_num * 1000)
        tmp_datetime.setTime(date_num)
    }
    
    
    
    return tmp_datetime.toLocaleDateString()
}


//坐标轴的显示
function axisLabel_formatter(value, index, data_form) {
    // 格式化刻度显示
    var text
    //console.log('form', data_form)
    switch (data_form) {
      case '.3s':
        if (parseInt(value)==value) {
          // 是否整数大于3位数
          if(value < 1000) {
            text = value.toString()
          } else {
            text = (value / 1000).toFixed(1) + 'K'
          }
          
        } else {
          //有小数
          if(value < 1000) {
              text = Number(value).toFixed(1)
          } else {
            text = (value / 1000).toFixed(1) + 'K'  
          }
        }
      break

      case '.4s':
        text = (value / 10000).toFixed(1) + '万'
      break

      case '￥,.2f':
        //TODO: ￥12,345.43 这样的格式
        text = '￥' + Number(value).toFixed(2) 
      break

      //TODO:其他格式
      // case '.4r':

      // break

      case '.3%':
        text = Number(value).toFixed(4) * 100
        text = text.toString() + '%'
      break

      default:
      text = value
    }
    
    return text
}
  //所有格式     
  // ['.3s', '.3s | 12.3k'],
  // ['.3%', '.3% | 1234543.210%'],
  // ['.4r', '.4r | 12350'],
  // ['.3f', '.3f | 12345.432'],
  // ['+,', '+, | +12,345.4321'],
  // ['$,.2f', '$,.2f | $12,345.43'],
  // ['.4s', '.4s | 12.3万'],
  // ['￥,.2f', '￥,.2f | ￥12,345.43'],
